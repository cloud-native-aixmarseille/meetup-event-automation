import {
	type EventDocument,
	type EventDocumentCodec,
	type EventRepository,
	EventRuleEngine,
	EventRuleFactory,
	type MeetupEvent,
} from "@meetup-automation/event";
import {
	type PublicAssetVenue,
	PublicationUrlPolicies,
	type PublicNextAssetEvent,
} from "@meetup-automation/publication";
import type { ReferentialCatalog } from "@meetup-automation/referential";

export class FindNextAssetEvent {
	constructor(
		private readonly repository: EventRepository,
		private readonly codec: EventDocumentCodec,
		private readonly venues: Readonly<Record<string, PublicAssetVenue>> = {},
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
					city: this.venues[host.id]?.city,
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
				label: "meetup",
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
		if (document.issueState !== "open" || !document.labels.includes("meetup"))
			return undefined;
		const decoded = this.codec.decode(document);
		const evaluated = new EventRuleEngine(
			EventRuleFactory.createDefaultEventRules(),
		).evaluate(decoded.event);
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
			PublicationUrlPolicies.createDefaultPublicationUrlPolicies()
				.filter((policy) => policy.id !== "asset-folder-url")
				.some((policy) => {
					const field =
						policy.id === "meetup-event-url" ? "meetup" : "community";
					return (
						Boolean(event.publicationLinks[field]) &&
						!policy
							.evaluate({ [field]: event.publicationLinks[field] })
							.diagnostics.some((item) => item.severity === "error")
					);
				});
		return published ? event : undefined;
	}
}
