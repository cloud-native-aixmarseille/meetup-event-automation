import { ConferenceHallInput } from "./conference-hall-input.js";
import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import {
	type EventDiagnostic,
	ListActiveEvents,
} from "@meetup-automation/event";
import {
	type AutomationConfig,
	ManageMeetupEvent,
	type PublicDiagnostic,
} from "@meetup-automation/journey";
import { ActionOutput } from "./action-output.js";
import type { ActionReportData } from "./action-report.js";
import { EventComposition, SERVICES } from "./composition.js";
import { ActionMessages } from "./i18n/action-messages.js";
import { RuntimeInput } from "./runtime-input.js";

export class EventActions {
	static async runEventReconcileAction(
		messages = new ActionMessages(),
	): Promise<ActionReportData> {
		const issueNumber = RuntimeInput.positiveIntegerInput(
			"issue-number",
			core.getInput("issue-number", { required: true }),
		);
		const token = core.getInput("github-token", { required: true });
		const commentAuthorLogin = core.getInput("managed-comment-author", {
			required: true,
		});
		const { owner, repo } = context.repo;
		const repository = `${owner}/${repo}`;
		const container = EventComposition.createEventContainer({
			locale: messages.locale,
			...ConferenceHallInput.read(),
			client: getOctokit(token),
			owner,
			repo,
			commentAuthorLogin,
		});
		const outcome = await container.get(ManageMeetupEvent).execute({
			identity: { repository, issueNumber },
			mode: "fix",
		});
		return EventActions.reconcileReport(issueNumber, outcome, messages);
	}

	static async runEventListActiveAction(
		messages = new ActionMessages(),
	): Promise<ActionReportData> {
		const token = core.getInput("github-token", { required: true });
		const { owner, repo } = context.repo;
		const repository = `${owner}/${repo}`;
		const container = EventComposition.createDocumentContainer({
			locale: messages.locale,
			client: getOctokit(token),
			owner,
			repo,
			commentAuthorLogin: "github-actions[bot]",
		});
		const config = container.get<AutomationConfig>(SERVICES.config);
		const outcome = await container.get(ListActiveEvents).execute({
			repository,
			label: config.event["issue-label"],
			includeClosed: true,
			pageSize: 100,
		});
		const issueNumbers = outcome.events.map(
			(event) => event.identity.issueNumber,
		);
		const diagnostics = outcome.diagnostics.map(
			EventActions.toPublicDiagnostic,
		);

		ActionOutput.setJsonOutput("issue-numbers", issueNumbers);
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

	private static reconcileReport(
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
					comment: String(outcome.commentUpdated),
				}),
			);
			if (!outcome.isReady) details.push(messages.t("report.event.guidance"));
		}
		return { details, diagnostics: outcome.diagnostics };
	}

	static toPublicDiagnostic(diagnostic: EventDiagnostic): PublicDiagnostic {
		return {
			code: diagnostic.code,
			severity: diagnostic.severity,
			message: diagnostic.message,
			...(diagnostic.field ? { field: diagnostic.field } : {}),
		};
	}
}
