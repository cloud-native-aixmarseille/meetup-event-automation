import type { AutomationStateRepository } from "@meetup-automation/journey";
import { GithubSocialDeliveryJournal } from "./github-social-delivery-journal.js";
import { SocialJournalAttemptCodec } from "./social-journal-attempt-codec.js";
import { SocialJournalCodec } from "./social-journal-codec.js";
import { SocialJournalTransition } from "./social-journal-transition.js";
import { SocialJournalValueSchema } from "./social-journal-value-schema.js";

export class GithubSocialDeliveryJournalComposition {
	create(
		state: Pick<AutomationStateRepository, "read" | "write">,
	): GithubSocialDeliveryJournal {
		const values = new SocialJournalValueSchema();
		const attempts = new SocialJournalAttemptCodec(values);
		return new GithubSocialDeliveryJournal(
			state,
			new SocialJournalCodec(values, attempts),
			new SocialJournalTransition(),
		);
	}
}
