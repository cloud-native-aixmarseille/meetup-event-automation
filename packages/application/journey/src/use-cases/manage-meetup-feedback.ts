import {
	type EventClock,
	type EventDocument,
	type EventDocumentCodec,
	type EventIdentity,
	EventNotFoundError,
	EventPaginationError,
	type EventRepository,
	EventRepositoryPatches,
	type MeetupEvent,
	ReconcileEvent,
} from "@meetup-automation/event";
import {
	type FeedbackAgenda,
	type FeedbackEventGateway,
	type FeedbackLinkConflict,
	type FeedbackLinkGateway,
	FeedbackLinkSelection,
	FeedbackPolicy,
	FeedbackResolutionError,
} from "@meetup-automation/publication";
import type { PublicDiagnostic } from "../result/result-envelope.js";
import { FeedbackAgendaProjection } from "./feedback-agenda-projection.js";
import type { ManageMeetupEvent } from "./manage-meetup-event.js";

interface FeedbackDependencies {
	readonly eventRepository: EventRepository;
	readonly eventLabel: string;
	readonly documentCodec: EventDocumentCodec;
	readonly manageEvent: Pick<ManageMeetupEvent, "execute">;
	readonly clock: EventClock;
	readonly links: FeedbackLinkGateway;
	readonly events: FeedbackEventGateway;
}

export type ManageMeetupFeedbackResult = Readonly<{
	skipped: boolean;
	persisted: boolean;
	feedbackUrl?: string;
	linkUpdated: boolean;
	diagnostics: readonly PublicDiagnostic[];
}>;

export class ManageMeetupFeedback {
	constructor(private readonly dependencies: FeedbackDependencies) {}

	async execute(input: {
		identity: EventIdentity;
	}): Promise<ManageMeetupFeedbackResult> {
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
				linkUpdated: false,
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
			!FeedbackPolicy.validDate(event.date) ||
			ManageMeetupFeedback.invalid(evaluation.diagnostics)
		)
			return this.skipped(
				"prerequisites",
				"Resolve the event date and feedback link before updating feedback",
			);
		const agenda = FeedbackAgendaProjection.create(
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
	): Promise<ManageMeetupFeedbackResult> {
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
				? { url: FeedbackPolicy.pollUrl(event.publicationLinks.feedback) }
				: {}),
		});
		const result = await this.reconcile(
			source,
			event,
			FeedbackPolicy.pollUrl(url),
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
		event: MeetupEvent,
		url: string,
	): Promise<ManageMeetupFeedbackResult> {
		await this.ensureCurrent(source);
		const { persisted, current } = await this.persist(source, url);
		const diagnostics: PublicDiagnostic[] = [];
		let linkUpdated = false;
		const now = this.dependencies.clock.now();
		if (FeedbackPolicy.isLinkUpdateDue(event.date, now, event.timeZone)) {
			const conflict = await this.linkConflict(source, event, now);
			if (conflict) diagnostics.push(conflict);
			else {
				await this.ensureCurrent(current);
				linkUpdated = await this.dependencies.links.updateTarget(url);
			}
		}
		return {
			skipped: false,
			persisted,
			feedbackUrl: url,
			linkUpdated,
			diagnostics,
		};
	}

	private static invalid(diagnostics: readonly PublicDiagnostic[]): boolean {
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
		if (EventRepositoryPatches.eventRepositoryPatchIsEmpty(patch))
			return { persisted: false, current: source };
		await this.ensureCurrent(source);
		await this.dependencies.eventRepository.applyPatch(source.identity, patch);
		return { persisted: true, current: { ...source, ...patch } };
	}

	private async linkConflict(
		source: EventDocument,
		target: MeetupEvent,
		now: string,
	): Promise<PublicDiagnostic | undefined> {
		let cursor: string | undefined;
		const visited = new Set<string>();
		for (let pages = 0; pages < 20; pages++) {
			const page = await this.dependencies.eventRepository.listPage({
				repository: source.identity.repository,
				label: this.dependencies.eventLabel,
				cursor,
			});
			for (const document of page.items) {
				if (document.identity.issueNumber === source.identity.issueNumber)
					continue;
				const { event } = this.dependencies.documentCodec.decode(document);
				const conflict = FeedbackLinkSelection.conflict(
					{
						date: event.date,
						isOpen: event.issueState === "open",
						occurrenceStatus: event.occurrenceStatus,
					},
					target.date,
					now,
					target.timeZone,
				);
				if (conflict) return ManageMeetupFeedback.conflictDiagnostic(conflict);
			}
			cursor = page.nextCursor;
			if (!cursor) return undefined;
			if (visited.has(cursor)) throw new EventPaginationError(cursor);
			visited.add(cursor);
		}
		throw new EventPaginationError("feedback-page-limit");
	}

	private static conflictDiagnostic(
		conflict: FeedbackLinkConflict,
	): PublicDiagnostic {
		return {
			code: `publication.feedback.${conflict}`,
			severity: conflict === "ambiguous-date" ? "warning" : "info",
			message:
				conflict === "ambiguous-date"
					? "Several active meetups share this date; update the shared feedback link manually"
					: "An active meetup takes place today; keep its shared feedback link until the event day ends",
		};
	}

	private ensureCurrent(source: EventDocument) {
		return ReconcileEvent.ensureEventDocumentIsCurrent(
			this.dependencies.eventRepository,
			source.identity,
			source,
		);
	}

	private skipped(
		code: string,
		message: string,
		severity: "info" | "warning" = "info",
	): ManageMeetupFeedbackResult {
		return {
			skipped: true,
			persisted: false,
			linkUpdated: false,
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
