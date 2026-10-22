import {
	type EventDocument,
	type EventIdentity,
	EventNotFoundError,
	type MeetupEvent,
} from "@meetup-automation/event";
import {
	type FeedbackAgenda,
	FeedbackResolutionError,
} from "@meetup-automation/publication";
import type { PublicDiagnostic } from "../result/result-envelope.js";
import type {
	FeedbackDependencies,
	ReconcileMeetupFeedbackCollaborators,
} from "./reconcile-meetup-feedback-contracts.js";

export type ReconcileMeetupFeedbackResult = Readonly<{
	skipped: boolean;
	persisted: boolean;
	feedbackUrl?: string;
	diagnostics: readonly PublicDiagnostic[];
}>;

export class ReconcileMeetupFeedback {
	constructor(
		private readonly collaborators: ReconcileMeetupFeedbackCollaborators,
		private readonly dependencies: FeedbackDependencies,
	) {}

	async execute(input: {
		identity: EventIdentity;
	}): Promise<ReconcileMeetupFeedbackResult> {
		const source = await this.dependencies.eventRepository.find(input.identity);
		if (!source) throw new EventNotFoundError(input.identity);
		const evaluation = await this.dependencies.manageEvent.execute({
			...input,
			mode: "check",
			sourceDocument: source,
		});
		if (evaluation.skipped)
			return this.skipped("unrelated", "This issue is not a meetup");
		const event = evaluation.event;
		if (
			event.proposalStatus === "stale" ||
			evaluation.diagnostics.some((item) =>
				item.code.startsWith("referential.source."),
			)
		)
			return {
				skipped: true,
				persisted: false,
				diagnostics: evaluation.diagnostics,
			};
		if (
			event.issueState === "closed" ||
			event.occurrenceStatus === "cancelled" ||
			event.occurrenceStatus === "postponed"
		)
			return this.skipped(
				"inactive",
				"Feedback automation is inactive for this event",
			);
		if (
			!this.collaborators.feedbackPolicy.validDate(event.date) ||
			this.invalid(evaluation.diagnostics)
		)
			return this.skipped(
				"prerequisites",
				"Resolve the event date and feedback link before updating feedback",
			);
		const agenda = this.collaborators.feedbackAgendaProjection.create(
			event,
			evaluation.diagnostics,
		);
		if (!agenda && !event.publicationLinks.feedback)
			return this.skipped(
				"agenda",
				"Complete talk subjects and resolve speaker references before creating feedback",
			);
		return this.synchronizeFeedback(source, event, agenda).catch(
			(error: unknown) => {
				if (
					!(error instanceof FeedbackResolutionError) ||
					error.kind !== "conflict"
				)
					throw error;
				return this.skipped(
					"conflict",
					"Resolve ambiguous feedback talk or speaker identities before synchronizing",
					"warning",
				);
			},
		);
	}

	private async synchronizeFeedback(
		source: EventDocument,
		event: MeetupEvent,
		agenda: FeedbackAgenda | undefined,
	): Promise<ReconcileMeetupFeedbackResult> {
		const name = event.eventTitle.trim().slice(0, 100);
		if (!name)
			return this.skipped(
				"prerequisites",
				"Set an event title before updating feedback",
			);
		await this.ensureCurrent(source);
		const { repository, issueNumber } = source.identity;
		const url = await this.dependencies.events.ensureEvent({
			key: `${repository.toLowerCase()}#${issueNumber}`,
			name,
			scheduleUrl: `https://github.com/${repository}/issues/${issueNumber}`,
			...(agenda ? { agenda } : {}),
			...(event.publicationLinks.feedback
				? {
						url: this.collaborators.feedbackPolicy.pollUrl(
							event.publicationLinks.feedback,
						),
					}
				: {}),
		});
		const result = await this.reconcile(
			source,
			this.collaborators.feedbackPolicy.pollUrl(url),
		);
		if (agenda) return result;
		return {
			...result,
			diagnostics: [
				...result.diagnostics,
				{
					code: "publication.feedback.agenda",
					severity: "warning" as const,
					field: "publicationLinks.feedback",
					message:
						"Complete talk subjects and resolve speaker references before synchronizing the feedback agenda",
				},
			],
		};
	}

	private async reconcile(
		source: EventDocument,
		url: string,
	): Promise<ReconcileMeetupFeedbackResult> {
		await this.ensureCurrent(source);
		const { persisted } = await this.persist(source, url);
		return {
			skipped: false,
			persisted,
			feedbackUrl: url,
			diagnostics: [],
		};
	}

	private invalid(diagnostics: readonly PublicDiagnostic[]): boolean {
		const fields = /date|feedback/i;
		return diagnostics.some(
			(item) =>
				item.severity === "error" &&
				(item.code.startsWith("event.document.") ||
					fields.test(item.field ?? "")),
		);
	}

	private async persist(
		source: EventDocument,
		feedbackUrl: string,
	): Promise<{ persisted: boolean; current: EventDocument }> {
		const original = this.dependencies.documentCodec.decode(source).event;
		if (original.publicationLinks.feedback === feedbackUrl)
			return { persisted: false, current: source };
		const patch = this.dependencies.documentCodec.createPatch(source, {
			...original,
			publicationLinks: { ...original.publicationLinks, feedback: feedbackUrl },
		});
		if (
			this.collaborators.eventRepositoryPatches.eventRepositoryPatchIsEmpty(
				patch,
			)
		)
			return { persisted: false, current: source };
		await this.ensureCurrent(source);
		await this.dependencies.eventRepository.applyPatch(source.identity, patch);
		return { persisted: true, current: { ...source, ...patch } };
	}

	private ensureCurrent(source: EventDocument) {
		return this.collaborators.eventDocumentConcurrency.ensureEventDocumentIsCurrent(
			this.dependencies.eventRepository,
			source.identity,
			source,
		);
	}

	private skipped(
		code: string,
		message: string,
		severity: "info" | "warning" = "info",
	): ReconcileMeetupFeedbackResult {
		return {
			skipped: true,
			persisted: false,
			diagnostics: [
				{
					code: `publication.feedback.${code}`,
					severity,
					field: "publicationLinks.feedback",
					message,
				},
			],
		};
	}
}
export type ReconcileMeetupFeedbackArguments =
	ConstructorParameters<typeof ReconcileMeetupFeedback> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
