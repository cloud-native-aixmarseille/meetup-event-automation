import { GithubSocialDeliveryJournal } from "./github-social-delivery-journal.js";
import { SocialJournalAttemptCodec } from "./social-journal-attempt-codec.js";
import { SocialJournalCodec } from "./social-journal-codec.js";
import type { SocialJournalCommentClient } from "./social-journal-comment-client.js";
import { SocialJournalTransition } from "./social-journal-transition.js";
import { SocialJournalValueSchema } from "./social-journal-value-schema.js";
import { TrustedSocialJournalComments } from "./trusted-social-journal-comments.js";

export class GithubSocialDeliveryJournalComposition {
	create(
		client: SocialJournalCommentClient,
		author: string,
	): GithubSocialDeliveryJournal {
		const values = new SocialJournalValueSchema();
		const attempts = new SocialJournalAttemptCodec(values);
		return new GithubSocialDeliveryJournal(
			client,
			new TrustedSocialJournalComments(client, author),
			new SocialJournalCodec(values, attempts),
			new SocialJournalTransition(),
		);
	}
}
