import {
	type EventClock,
	type EventDocument,
	type EventDocumentCodec,
	type EventDocumentConcurrency,
	EventPaginationError,
	type EventRepository,
} from "@meetup-automation/event";
import type {
	FeedbackLinkGateway,
	FeedbackLinkSelection,
	FeedbackPolicy,
} from "@meetup-automation/publication";
import type { PublicDiagnostic } from "../result/result-envelope.js";

export class ReconcileFeedbackLink {
	constructor(
		private readonly dependencies: {
			events: EventRepository;
			codec: EventDocumentCodec;
			clock: EventClock;
			concurrency: Pick<
				EventDocumentConcurrency,
				"ensureEventDocumentIsCurrent"
			>;
			selection: Pick<FeedbackLinkSelection, "select">;
			policy: Pick<FeedbackPolicy, "pollUrl">;
			links: FeedbackLinkGateway;
			label: string;
			timeZone: string;
		},
	) {}

	async execute(
		repository: string,
	): Promise<{ updated: boolean; diagnostics: readonly PublicDiagnostic[] }> {
		const documents = await this.list(repository);
		const decoded = documents.map((document) =>
			this.dependencies.codec.decode(document),
		);
		const selection = this.dependencies.selection.select(
			decoded.map(({ event }) => ({
				date: event.date,
				isOpen: event.issueState === "open",
				occurrenceStatus: event.occurrenceStatus,
			})),
			this.dependencies.clock.now(),
			this.dependencies.timeZone,
		);
		if (selection.conflict) return this.blocked("ambiguous-date");
		if (selection.index === undefined)
			return { updated: false, diagnostics: [] };
		const selected = decoded[selection.index];
		if (
			!selected.event.publicationLinks.feedback ||
			selected.diagnostics.some(
				(item) =>
					item.severity === "error" &&
					/date|feedback|document/.test(`${item.code}:${item.field ?? ""}`),
			)
		)
			return this.blocked("prerequisites");
		let url: string;
		try {
			url = this.dependencies.policy.pollUrl(
				selected.event.publicationLinks.feedback,
			);
		} catch {
			return this.blocked("prerequisites");
		}
		const current = await this.list(repository);
		if (
			current.length !== documents.length ||
			current.some(
				(item) =>
					!documents.some(
						(original) =>
							original.identity.issueNumber === item.identity.issueNumber,
					),
			)
		)
			throw new Error("Feedback candidates changed during reconciliation");
		for (const document of documents)
			await this.dependencies.concurrency.ensureEventDocumentIsCurrent(
				this.dependencies.events,
				document.identity,
				document,
			);
		return {
			updated: await this.dependencies.links.updateTarget(url),
			diagnostics: [],
		};
	}

	private async list(repository: string): Promise<EventDocument[]> {
		const documents: EventDocument[] = [];
		const visited = new Set<string>();
		let cursor: string | undefined;
		for (let page = 0; page < 20; page++) {
			const result = await this.dependencies.events.listPage({
				repository,
				label: this.dependencies.label,
				cursor,
			});
			documents.push(
				...result.items.filter(
					(item) =>
						item.issueState === "open" &&
						item.labels.includes(this.dependencies.label),
				),
			);
			cursor = result.nextCursor;
			if (!cursor) return documents;
			if (visited.has(cursor)) throw new EventPaginationError(cursor);
			visited.add(cursor);
		}
		throw new EventPaginationError("feedback-page-limit");
	}
	private blocked(code: "ambiguous-date" | "prerequisites") {
		return {
			updated: false,
			diagnostics: [
				{
					code: `publication.feedback-link.${code}`,
					severity: "warning" as const,
					message:
						"Resolve the active feedback event before updating the shared link",
				},
			],
		};
	}
}
