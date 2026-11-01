import {
	LinkedInPostReference,
	type LinkedInShareRecord,
	LinkedInSharingState,
} from "@meetup-automation/communication";
import { describe, expect, it } from "vitest";
import { journalClientFixture } from "../testing/journal-client.fixtures.js";
import { GithubLinkedInSharingJournal } from "./github-linkedin-sharing-journal.js";
import {
	LINKEDIN_SHARING_MARKER,
	LinkedInSharingCodec,
} from "./linkedin-sharing-codec.js";
import { SocialJournalValueSchema } from "./social-journal-value-schema.js";
import { TrustedSocialJournalComments } from "./trusted-social-journal-comments.js";

const reserved: LinkedInShareRecord = {
	id: "urn:li:activity:12345",
	url: "https://www.linkedin.com/feed/update/urn:li:activity:12345/",
	status: "pending",
	attempts: 1,
	reservedAt: "2099-06-01T10:00:00Z",
};
function fixture() {
	const f = journalClientFixture();
	const journal = new GithubLinkedInSharingJournal(
		f.client,
		new TrustedSocialJournalComments(
			f.client,
			"automation[bot]",
			LINKEDIN_SHARING_MARKER,
		),
		new LinkedInSharingCodec(
			new SocialJournalValueSchema(),
			new LinkedInPostReference(),
		),
		new LinkedInSharingState(),
	);
	return { ...f, journal };
}
describe("durable LinkedIn sharing journal", () => {
	it("persists the reservation and sent receipt in a verified bot comment", async () => {
		// Arrange
		const f = fixture();
		const sent = { ...reserved, status: "sent" as const };
		// Act
		await f.journal.save(undefined, reserved);
		await f.journal.save(reserved, sent);
		const record = await f.journal.load(reserved.id);
		// Assert
		expect(record).toEqual(sent);
		expect(f.comments).toHaveLength(1);
		expect(f.comments[0].body).toContain(LINKEDIN_SHARING_MARKER);
	});
	it("refuses a stale reservation and preserves sent history", async () => {
		// Arrange
		const f = fixture();
		await f.journal.save(undefined, reserved);
		// Act
		const save = f.journal.save(undefined, reserved);
		// Assert
		await expect(save).rejects.toThrow("changed before persistence");
		expect(f.comments).toHaveLength(1);
	});
	it("refuses externally edited notification state", async () => {
		// Arrange
		const f = fixture();
		await f.journal.save(undefined, reserved);
		const current = f.edits.get(1);
		if (!current) throw new Error("Missing test comment");
		f.edits.set(1, {
			...current,
			lastEditedAt: reserved.reservedAt,
			editor: { login: "organizer", __typename: "User" },
		});
		f.histories.set(1, [
			{
				diff: f.comments[0].body ?? "",
				deletedAt: null,
				editor: { login: "organizer", __typename: "User" },
			},
		]);
		// Act
		const load = f.journal.load(reserved.id);
		// Assert
		await expect(load).rejects.toThrow("edited outside automation");
	});
	it("rejects duplicate records instead of treating either as unsent", async () => {
		// Arrange
		const f = fixture();
		await f.journal.save(undefined, reserved);
		await f.client.create(f.comments[0].body ?? "");
		// Act
		const load = f.journal.load(reserved.id);
		// Assert
		await expect(load).rejects.toThrow("Duplicate LinkedIn sharing identity");
	});
});
