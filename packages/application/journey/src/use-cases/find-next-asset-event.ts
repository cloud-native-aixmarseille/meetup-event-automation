import type {
	EventDocument,
	EventDocumentCodec,
	EventRepository,
	EventRuleEngine,
	EventRuleEngineArguments,
	EventRuleFactory,
	MeetupEvent,
	MeetupPublicationChecklist,
} from "@meetup-automation/event";
import type {
	PublicationUrlPolicy,
	PublicNextAssetEvent,
} from "@meetup-automation/publication";
import type { ReferentialCatalog } from "@meetup-automation/referential";

export interface FindNextAssetEventCollaborators {
	readonly eventRuleFactory: Pick<EventRuleFactory, "createDefaultEventRules">;
	readonly meetupEventUrlPolicy: Pick<PublicationUrlPolicy, "evaluate">;
	readonly communityEventUrlPolicy: Pick<PublicationUrlPolicy, "evaluate">;
	readonly meetupPublicationChecklist: Pick<
		MeetupPublicationChecklist,
		"isPublished"
	>;
	readonly createEventRuleEngine: (
		...args: EventRuleEngineArguments
	) => EventRuleEngine;
}

export class FindNextAssetEvent {
	constructor(
		private readonly collaborators: FindNextAssetEventCollaborators,
		private readonly repository: Pick<EventRepository, "listPage">,
		private readonly codec: EventDocumentCodec,
		private readonly eventLabel: string,
	) {}

	async find(
		current: MeetupEvent,
		catalog: ReferentialCatalog,
	): Promise<PublicNextAssetEvent | undefined> {
		const candidates = await this.candidates(current);
		candidates.sort(
			(a, b) =>
				a.date.localeCompare(b.date) ||
				a.identity.issueNumber - b.identity.issueNumber,
		);
		for (const candidate of candidates) {
			const host = catalog.hosts.find((item) => item.id === candidate.host?.id);
			if (host)
				return {
					date: candidate.date,
					hostName: host.displayName,
					city: host.publicVenue?.city,
				};
		}
		return undefined;
	}

	private async candidates(current: MeetupEvent): Promise<MeetupEvent[]> {
		const events: MeetupEvent[] = [];
		const seen = new Set<number>();
		const cursors = new Set<string>();
		let cursor: string | undefined;
		for (let pages = 0; pages < 20; pages++) {
			const page = await this.repository.listPage({
				repository: current.identity.repository,
				label: this.eventLabel,
				includeClosed: false,
				pageSize: 100,
				cursor,
			});
			events.push(...this.pageCandidates(page.items, current, seen));
			cursor = page.nextCursor;
			if (!cursor) return events;
			if (cursors.has(cursor))
				throw new Error("Asset event listing repeated a cursor");
			cursors.add(cursor);
		}
		throw new Error("Asset event page limit exceeded");
	}

	private pageCandidates(
		documents: readonly EventDocument[],
		current: MeetupEvent,
		seen: Set<number>,
	): MeetupEvent[] {
		const events: MeetupEvent[] = [];
		for (const document of documents) {
			if (
				document.identity.repository !== current.identity.repository ||
				seen.has(document.identity.issueNumber)
			)
				continue;
			seen.add(document.identity.issueNumber);
			if (seen.size > 200)
				throw new Error("Asset event selection limit exceeded");
			const event = this.candidate(document, current);
			if (event) events.push(event);
		}
		return events;
	}

	private candidate(
		document: EventDocument,
		current: MeetupEvent,
	): MeetupEvent | undefined {
		if (
			document.issueState !== "open" ||
			!document.labels.includes(this.eventLabel)
		)
			return undefined;
		const decoded = this.codec.decode(document);
		const evaluated = this.collaborators
			.createEventRuleEngine(
				this.collaborators.eventRuleFactory.createDefaultEventRules(),
			)
			.evaluate(decoded.event);
		const event = evaluated.event;
		const invalid = [...decoded.diagnostics, ...evaluated.diagnostics].some(
			(item) =>
				item.severity === "error" &&
				(/date|host/.test(item.field ?? "") ||
					item.code.startsWith("event.document.")),
		);
		if (
			invalid ||
			event.date <= current.date ||
			event.occurrenceStatus !== "scheduled" ||
			!event.confirmations.host
		)
			return undefined;
		const published =
			(this.collaborators.meetupPublicationChecklist.isPublished(event) &&
				this.validLink(
					event,
					"meetup",
					this.collaborators.meetupEventUrlPolicy,
				)) ||
			this.validLink(
				event,
				"community",
				this.collaborators.communityEventUrlPolicy,
			);
		return published ? event : undefined;
	}

	private validLink(
		event: MeetupEvent,
		field: "meetup" | "community",
		policy: Pick<PublicationUrlPolicy, "evaluate">,
	): boolean {
		const value = event.publicationLinks[field];
		return (
			Boolean(value) &&
			!policy
				.evaluate({ [field]: value })
				.diagnostics.some((item) => item.severity === "error")
		);
	}
}
export type FindNextAssetEventArguments =
	ConstructorParameters<typeof FindNextAssetEvent> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
