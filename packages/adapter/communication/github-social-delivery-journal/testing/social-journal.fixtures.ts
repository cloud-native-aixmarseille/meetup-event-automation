import type {
	SocialDeliveryAttempt,
	SocialDeliveryRecord,
} from "@meetup-automation/communication";
import { GithubSocialDeliveryJournal } from "../src/github-social-delivery-journal.js";
import { SocialJournalAttemptCodec } from "../src/social-journal-attempt-codec.js";
import { SocialJournalCodec } from "../src/social-journal-codec.js";
import { SocialJournalTransition } from "../src/social-journal-transition.js";
import { SocialJournalValueSchema } from "../src/social-journal-value-schema.js";
import { journalClientFixture } from "./journal-client.fixtures.js";

export function socialRecord(
	attempts: readonly SocialDeliveryAttempt[] = [],
): SocialDeliveryRecord {
	return {
		intentId: "event-announcement-channel-one",
		occurrence: "2026-11-20T17:30:00Z",
		purpose: "announcement",
		destination: {
			key: "channel-one",
			provider: "slack",
			label: "Community channel",
			workspaceId: "T123",
			channelId: "C123",
		},
		attempts,
	};
}

export function socialAttempt(
	overrides: Partial<SocialDeliveryAttempt> = {},
): SocialDeliveryAttempt {
	return {
		id: "attempt-one",
		revision: "revision-one",
		reservedAt: "2026-10-20T12:00:00Z",
		status: "reserved",
		...overrides,
	};
}

export function socialJournalFixture() {
	const f = journalClientFixture();
	const values = new SocialJournalValueSchema();
	const attempts = new SocialJournalAttemptCodec(values);
	const codec = new SocialJournalCodec(values, attempts);
	const transitions = new SocialJournalTransition();
	const journal = new GithubSocialDeliveryJournal(
		f.client,
		f.trusted,
		codec,
		transitions,
	);
	return { ...f, values, attempts, codec, transitions, journal };
}
