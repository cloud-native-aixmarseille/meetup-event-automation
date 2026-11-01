import {
	LinkedInPostReference,
	LinkedInSharingState,
} from "@meetup-automation/communication";
import { GithubLinkedInSharingJournal } from "./github-linkedin-sharing-journal.js";
import { GithubSocialDeliveryJournal } from "./github-social-delivery-journal.js";
import {
	LINKEDIN_SHARING_MARKER,
	LinkedInSharingCodec,
} from "./linkedin-sharing-codec.js";
import { SocialJournalAttemptCodec } from "./social-journal-attempt-codec.js";
import { SocialJournalCodec } from "./social-journal-codec.js";
import type { SocialJournalCommentClient } from "./social-journal-comment-client.js";
import { SocialJournalTransition } from "./social-journal-transition.js";
import { SocialJournalValueSchema } from "./social-journal-value-schema.js";
import {
	SOCIAL_JOURNAL_MARKER,
	TrustedSocialJournalComments,
} from "./trusted-social-journal-comments.js";

export class GithubSocialDeliveryJournalComposition {
	sharing(
		client: SocialJournalCommentClient,
		author: string,
	): GithubLinkedInSharingJournal {
		return new GithubLinkedInSharingJournal(
			client,
			new TrustedSocialJournalComments(client, author, LINKEDIN_SHARING_MARKER),
			new LinkedInSharingCodec(
				new SocialJournalValueSchema(),
				new LinkedInPostReference(),
			),
			new LinkedInSharingState(),
		);
	}
	create(
		client: SocialJournalCommentClient,
		author: string,
	): GithubSocialDeliveryJournal {
		const values = new SocialJournalValueSchema();
		const attempts = new SocialJournalAttemptCodec(values);
		return new GithubSocialDeliveryJournal(
			client,
			new TrustedSocialJournalComments(client, author, SOCIAL_JOURNAL_MARKER),
			new SocialJournalCodec(values, attempts),
			new SocialJournalTransition(),
		);
	}
}
