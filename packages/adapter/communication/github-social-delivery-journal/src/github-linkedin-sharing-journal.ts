import { isDeepStrictEqual } from "node:util";
import type {
	LinkedInShareRecord,
	LinkedInSharingJournal,
	LinkedInSharingState,
} from "@meetup-automation/communication";
import type { LinkedInSharingCodec } from "./linkedin-sharing-codec.js";
import type { SocialJournalCommentClient } from "./social-journal-comment-client.js";
import type { TrustedSocialJournalComments } from "./trusted-social-journal-comments.js";

export class GithubLinkedInSharingJournal implements LinkedInSharingJournal {
	constructor(
		private readonly client: Pick<
			SocialJournalCommentClient,
			"create" | "replace"
		>,
		private readonly comments: Pick<TrustedSocialJournalComments, "list">,
		private readonly codec: Pick<LinkedInSharingCodec, "read" | "write">,
		private readonly states: Pick<LinkedInSharingState, "validate">,
	) {}
	async load(id: string): Promise<LinkedInShareRecord | undefined> {
		return (await this.records()).find((item) => item.record.id === id)?.record;
	}
	async save(
		previous: LinkedInShareRecord | undefined,
		next: LinkedInShareRecord,
	): Promise<void> {
		const body = this.codec.write(next);
		const existing = (await this.records()).find(
			(item) => item.record.id === next.id,
		);
		if (!isDeepStrictEqual(existing?.record, previous))
			throw new Error("LinkedIn sharing history changed before persistence");
		this.states.validate(previous, next);
		if (existing)
			await this.client.replace(
				existing.comment.id,
				existing.comment.body ?? "",
				body,
			);
		else await this.client.create(body);
		if (!isDeepStrictEqual(await this.load(next.id), next))
			throw new Error("LinkedIn sharing persistence readback is uncertain");
	}
	private async records() {
		const records = (await this.comments.list()).map((comment) => ({
			comment,
			record: this.codec.read(comment.body ?? ""),
		}));
		if (new Set(records.map((item) => item.record.id)).size !== records.length)
			throw new Error("Duplicate LinkedIn sharing identity");
		return records;
	}
}
