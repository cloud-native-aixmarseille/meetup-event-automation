import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import type {
	EventDiagnostic,
	ListActiveEvents,
} from "@meetup-automation/event";
import type {
	ManageMeetupEvent,
	PublicDiagnostic,
} from "@meetup-automation/journey";
import type { ActionOutput } from "./action-output.js";
import type { ActionReportData } from "./action-report.js";
import type { EventComposition } from "./composition.js";
import type { ConferenceHallInput } from "./conference-hall-input.js";
import type { ActionMessages } from "./i18n/action-messages.js";
import type { PublicationUrlInput } from "./publication-url-input.js";
import type { RuntimeInput } from "./runtime-input.js";

export interface EventActionsCollaborators {
	readonly publicationUrlInput: Pick<
		PublicationUrlInput,
		| "readMeetupEventUrlPrefix"
		| "readCommunityEventUrlPrefixes"
		| "readAssetFolderUrlPrefix"
	>;
	readonly createEventJourney: (
		input: Parameters<typeof EventComposition.createEventContainer>[0],
	) => Pick<ManageMeetupEvent, "execute">;
	readonly createEventListing: (
		input: Parameters<typeof EventComposition.createDocumentContainer>[0],
	) => { events: Pick<ListActiveEvents, "execute">; label: string };
	readonly runtimeInput: Pick<RuntimeInput, "positiveIntegerInput">;
	readonly conferenceHallInput: Pick<
		ConferenceHallInput,
		"read" | "readEventUrl"
	>;
	readonly actionOutput: Pick<ActionOutput, "setJsonOutput">;
}

export class EventActions {
	constructor(private readonly collaborators: EventActionsCollaborators) {}

	async runEventReconcileAction(
		messages: ActionMessages,
	): Promise<ActionReportData> {
		const issueNumber = this.collaborators.runtimeInput.positiveIntegerInput(
			"issue-number",
			core.getInput("issue-number", { required: true }),
		);
		const token = core.getInput("github-token", { required: true });
		const { owner, repo } = context.repo;
		const repository = `${owner}/${repo}`;
		const conferenceHall = this.collaborators.conferenceHallInput.read();
		const journey = this.collaborators.createEventJourney({
			meetupEventUrlPrefix:
				this.collaborators.publicationUrlInput.readMeetupEventUrlPrefix(),
			communityEventUrlPrefixes:
				this.collaborators.publicationUrlInput.readCommunityEventUrlPrefixes(),
			assetFolderUrlPrefix:
				this.collaborators.publicationUrlInput.readAssetFolderUrlPrefix(),
			locale: messages.locale,
			...conferenceHall,
			conferenceHallEventUrl:
				this.collaborators.conferenceHallInput.readEventUrl(
					conferenceHall.conferenceHallEvent,
				),
			client: getOctokit(token),
			owner,
			repo,
		});
		const outcome = await journey.execute({
			identity: { repository, issueNumber },
			mode: "fix",
		});
		return this.reconcileReport(issueNumber, outcome, messages);
	}

	async runEventListActiveAction(
		messages: ActionMessages,
	): Promise<ActionReportData> {
		const token = core.getInput("github-token", { required: true });
		const { owner, repo } = context.repo;
		const repository = `${owner}/${repo}`;
		const listing = this.collaborators.createEventListing({
			locale: messages.locale,
			client: getOctokit(token),
			owner,
			repo,
		});
		const outcome = await listing.events.execute({
			repository,
			label: listing.label,
			pageSize: 100,
		});
		const issueNumbers = outcome.events.map(
			(event) => event.identity.issueNumber,
		);
		const diagnostics = outcome.diagnostics.map(
			this.toPublicDiagnostic.bind(this),
		);

		this.collaborators.actionOutput.setJsonOutput(
			"issue-numbers",
			issueNumbers,
		);
		return {
			details: [
				messages.t("report.events.count", { count: issueNumbers.length }),
				issueNumbers.length > 0
					? messages.t("report.events.issues", {
							issues: issueNumbers.join(", "),
						})
					: messages.t("report.events.empty"),
			],
			diagnostics,
		};
	}

	private reconcileReport(
		issueNumber: number,
		outcome: Awaited<ReturnType<ManageMeetupEvent["execute"]>>,
		messages: ActionMessages,
	): ActionReportData {
		const details = [
			messages.t("report.event.context", { issue: issueNumber, mode: "fix" }),
		];
		if (outcome.skipped) {
			details.push(messages.t("report.event.skipped"));
		} else {
			details.push(
				messages.t("report.event.state", {
					state: outcome.state,
					ready: String(outcome.isReady),
				}),
				messages.t("report.event.persisted", {
					persisted: String(outcome.persisted),
				}),
			);
		}
		return { details, diagnostics: outcome.diagnostics };
	}

	toPublicDiagnostic(diagnostic: EventDiagnostic): PublicDiagnostic {
		return {
			code: diagnostic.code,
			severity: diagnostic.severity,
			message: diagnostic.message,
			...(diagnostic.field ? { field: diagnostic.field } : {}),
		};
	}
}
