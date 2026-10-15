import { OpenFeedbackClient } from "./openfeedback-client.js";
import type {
	OpenFeedbackSpeaker,
	OpenFeedbackTalk,
} from "./openfeedback-agenda-snapshot.js";

type RecordKind = "speakers" | "talks";
type FeedbackRecord = OpenFeedbackSpeaker | OpenFeedbackTalk;

export class OpenFeedbackRecordsGateway {
	constructor(private readonly client: OpenFeedbackClient) {}

	async list(eventId: string, kind: RecordKind): Promise<unknown[]> {
		const records: unknown[] = [];
		const cursors = new Set<string>();
		let cursor: string | null = null;
		for (;;) {
			const query = cursor ? `&after=${encodeURIComponent(cursor)}` : "";
			const path = `/events/${eventId}/${kind}?limit=100${query}`;
			const body = await OpenFeedbackClient.read(
				await this.client.request(path, "GET"),
				eventId,
			);
			const page = body[kind];
			const next = body.nextCursor;
			if (
				!Array.isArray(page) ||
				page.length > 100 ||
				!OpenFeedbackRecordsGateway.validCursor(next)
			)
				throw new Error("Invalid OpenFeedback list response");
			records.push(...page);
			if (records.length > 200 || (records.length === 200 && next !== null))
				throw new Error("Feedback records exceed the synchronization limits");
			if (next === null) return records;
			if (cursors.has(next) || page.at(-1)?.id !== next)
				throw new Error("Invalid OpenFeedback pagination cursor");
			cursors.add(next);
			cursor = next;
		}
	}

	async synchronize(
		eventId: string,
		kind: RecordKind,
		record: FeedbackRecord,
		previous: (FeedbackRecord & { readonly revision: string }) | undefined,
	): Promise<void> {
		const { id, ...fields } = record;
		if (previous && OpenFeedbackRecordsGateway.unchanged(fields, previous))
			return;
		const base = `/events/${eventId}/${kind}`;
		const response = previous
			? await this.client.request(`${base}/${id}`, "PATCH", {
					...fields,
					revision: previous.revision,
				})
			: await this.client.request(base, "POST", record);
		await OpenFeedbackClient.read(response, id);
	}

	private static unchanged(
		fields: Omit<FeedbackRecord, "id">,
		previous: FeedbackRecord,
	): boolean {
		return Object.entries(fields).every(([key, value]) => {
			const stored = (previous as unknown as Record<string, unknown>)[key];
			if (key === "speakers" && Array.isArray(stored) && Array.isArray(value))
				return (
					JSON.stringify([...stored].sort()) ===
					JSON.stringify([...value].sort())
				);
			return JSON.stringify(stored) === JSON.stringify(value);
		});
	}

	private static validCursor(value: unknown): value is string | null {
		return (
			value === null ||
			(typeof value === "string" &&
				/^(?!__.*__$)[a-zA-Z0-9_-]{1,100}$/.test(value))
		);
	}
}
