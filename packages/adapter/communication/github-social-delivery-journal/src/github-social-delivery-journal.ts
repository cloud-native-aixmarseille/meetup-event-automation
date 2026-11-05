import { isDeepStrictEqual } from "node:util";
import type {
	SocialDeliveryJournal,
	SocialDeliveryRecord,
} from "@meetup-automation/communication";
import type { SocialJournalCodec } from "./social-journal-codec.js";
import type { AutomationStateRepository } from "@meetup-automation/journey";
import type { SocialJournalTransition } from "./social-journal-transition.js";

export class GithubSocialDeliveryJournal implements SocialDeliveryJournal {
	constructor(
		private readonly state: Pick<AutomationStateRepository, "read" | "write">,
		private readonly codec: Pick<SocialJournalCodec, "read" | "write">,
		private readonly transitions: Pick<SocialJournalTransition, "validate">,
	) {}

	async load(intentId: string): Promise<SocialDeliveryRecord | undefined> {
		return (await this.records()).find(
			(entry) => entry.record.intentId === intentId,
		)?.record;
	}

	async save(
		previous: SocialDeliveryRecord | undefined,
		next: SocialDeliveryRecord,
	): Promise<void> {
		const body = this.codec.write(next);
		const canonical = this.codec.read(body);
		const prior = previous
			? this.codec.read(this.codec.write(previous))
			: undefined;
		const records = await this.records();
		const existing = records.find(
			(entry) => entry.record.intentId === next.intentId,
		);
		if (!isDeepStrictEqual(existing?.record, prior))
			throw new Error("Social delivery history changed before persistence");
		this.transitions.validate(prior, canonical);
		const nextRecords = records.map((entry) =>
			entry.record.intentId === next.intentId ? body : entry.body,
		);
		if (!existing) nextRecords.push(body);
		await this.state.write(
			"social",
			records.map((entry) => entry.body),
			nextRecords,
		);
		const saved = await this.load(next.intentId);
		if (!isDeepStrictEqual(saved, canonical))
			throw new Error("Social delivery persistence readback is uncertain");
	}

	private async records(): Promise<
		readonly { body: string; record: SocialDeliveryRecord }[]
	> {
		const records: {
			body: string;
			record: SocialDeliveryRecord;
		}[] = [];
		for (const body of await this.state.read("social")) {
			const record = this.codec.read(body);
			if (records.some((entry) => entry.record.intentId === record.intentId))
				throw new Error("Duplicate social delivery journal identity");
			records.push({ body, record });
		}
		return records;
	}
}
