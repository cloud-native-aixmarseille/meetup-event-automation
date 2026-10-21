import type {
	OpenFeedbackSpeaker,
	OpenFeedbackTalk,
} from "./openfeedback-agenda-snapshot.js";
import type { OpenFeedbackClient } from "./openfeedback-client.js";
import type { OpenFeedbackRecordEquality } from "./openfeedback-record-equality.js";
import type { OpenFeedbackResourceId } from "./openfeedback-resource-id.js";
import type { OpenFeedbackResponse } from "./openfeedback-response.js";

type RecordKind = "speakers" | "talks";
type FeedbackRecord = OpenFeedbackSpeaker | OpenFeedbackTalk;

export interface OpenFeedbackRecordsGatewayCollaborators {
	readonly openFeedbackResponse: Pick<OpenFeedbackResponse, "read">;
	readonly openFeedbackRecordEquality: Pick<
		OpenFeedbackRecordEquality,
		"equal"
	>;
	readonly openFeedbackResourceId: Pick<OpenFeedbackResourceId, "isValid">;
}

export class OpenFeedbackRecordsGateway {
	constructor(
		private readonly collaborators: OpenFeedbackRecordsGatewayCollaborators,
		private readonly client: OpenFeedbackClient,
	) {}

	async list(eventId: string, kind: RecordKind): Promise<unknown[]> {
		const records: unknown[] = [];
		const cursors = new Set<string>();
		let cursor: string | null = null;
		for (;;) {
			const query = cursor ? `&after=${encodeURIComponent(cursor)}` : "";
			const path = `/events/${eventId}/${kind}?limit=100${query}`;
			const body = await this.collaborators.openFeedbackResponse.read(
				await this.client.request(path, "GET"),
				eventId,
			);
			const page = body[kind];
			const next = body.nextCursor;
			if (!Array.isArray(page) || page.length > 100 || !this.validCursor(next))
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
		if (
			previous &&
			this.collaborators.openFeedbackRecordEquality.equal(record, previous)
		)
			return;
		const base = `/events/${eventId}/${kind}`;
		const response = previous
			? await this.client.request(
					`${base}/${encodeURIComponent(id)}`,
					"PATCH",
					{
						...fields,
						revision: previous.revision,
					},
				)
			: await this.client.request(base, "POST", record);
		await this.collaborators.openFeedbackResponse.read(response, id);
	}

	private validCursor(value: unknown): value is string | null {
		return (
			value === null || this.collaborators.openFeedbackResourceId.isValid(value)
		);
	}
}
export type OpenFeedbackRecordsGatewayArguments =
	ConstructorParameters<typeof OpenFeedbackRecordsGateway> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
