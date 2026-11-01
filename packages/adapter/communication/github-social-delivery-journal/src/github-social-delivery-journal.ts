import { isDeepStrictEqual } from "node:util";
import type {
	SocialDeliveryJournal,
	SocialDeliveryRecord,
} from "@meetup-automation/communication";
import type { SocialJournalCodec } from "./social-journal-codec.js";
import type {
	SocialJournalComment,
	SocialJournalCommentClient,
} from "./social-journal-comment-client.js";
import type { SocialJournalTransition } from "./social-journal-transition.js";
import type { TrustedSocialJournalComments } from "./trusted-social-journal-comments.js";

export class GithubSocialDeliveryJournal implements SocialDeliveryJournal {
	constructor(
		private readonly client: Pick<
			SocialJournalCommentClient,
			"create" | "replace"
		>,
		private readonly comments: Pick<TrustedSocialJournalComments, "list">,
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
		const existing = (await this.records()).find(
			(entry) => entry.record.intentId === next.intentId,
		);
		if (!isDeepStrictEqual(existing?.record, prior))
			throw new Error("Social delivery history changed before persistence");
		this.transitions.validate(prior, canonical);
		if (existing) {
			await this.client.replace(
				existing.comment.id,
				existing.comment.body ?? "",
				body,
			);
		} else await this.client.create(body);
		const saved = await this.load(next.intentId);
		if (!isDeepStrictEqual(saved, canonical))
			throw new Error("Social delivery persistence readback is uncertain");
	}

	private async records(): Promise<
		readonly { comment: SocialJournalComment; record: SocialDeliveryRecord }[]
	> {
		const records: {
			comment: SocialJournalComment;
			record: SocialDeliveryRecord;
		}[] = [];
		for (const comment of await this.comments.list()) {
			const record = this.codec.read(comment.body ?? "");
			if (records.some((entry) => entry.record.intentId === record.intentId))
				throw new Error("Duplicate social delivery journal identity");
			records.push({ comment, record });
		}
		return records;
	}
}
