import { describe, expect, it } from "vitest";
import {
	socialAttempt,
	socialJournalFixture,
	socialRecord,
} from "../testing/social-journal.fixtures.js";
import { SocialJournalCodec } from "./social-journal-codec.js";
import { SOCIAL_JOURNAL_MARKER } from "./trusted-social-journal-comments.js";

describe("social delivery stored schema", () => {
	it("preserves a verified LinkedIn activity permalink without inventing a share identity", () => {
		// Arrange
		const f = socialJournalFixture();
		const record = {
			...socialRecord([
				socialAttempt({
					status: "accepted",
					receipt: {
						provider: "linkedin",
						organizationUrn: "urn:li:organization:123",
						postUrn: "urn:li:activity:456",
						url: "https://www.linkedin.com/feed/update/urn:li:activity:456/",
					},
					recovery: {
						actor: "organizer",
						decidedAt: "2026-10-20T13:00:00Z",
						outcome: "published",
						reference:
							"https://www.linkedin.com/feed/update/urn:li:activity:456/",
					},
				}),
			]),
			destination: {
				key: "community-page",
				label: "Community Page",
				provider: "linkedin" as const,
				organizationUrn: "urn:li:organization:123",
			},
		};

		// Act
		const saved = f.codec.read(f.codec.write(record));

		// Assert
		expect(saved).toEqual(record);
	});
	it("round-trips a stale pre-write reservation and its fresh replay", () => {
		// Arrange
		const f = socialJournalFixture();
		const record = socialRecord([
			socialAttempt({ status: "stale" }),
			socialAttempt({ id: "attempt-two" }),
		]);

		// Act
		const saved = f.codec.read(f.codec.write(record));

		// Assert
		expect(saved).toEqual(record);
	});
	it("round-trips LinkedIn prepared media and public post identity", () => {
		// Arrange
		const f = socialJournalFixture();
		const record = {
			...socialRecord([
				socialAttempt({
					status: "accepted",
					media: {
						assetUrn: "urn:li:image:image-one",
						fingerprint: "a".repeat(64),
						description: "Meetup announcement artwork",
					},
					receipt: {
						provider: "linkedin",
						organizationUrn: "urn:li:organization:123",
						postUrn: "urn:li:share:456",
						url: "https://www.linkedin.com/feed/update/urn:li:share:456/",
					},
				}),
			]),
			destination: {
				key: "community-page",
				label: "Community Page",
				provider: "linkedin" as const,
				organizationUrn: "urn:li:organization:123",
			},
		};

		// Act
		const saved = f.codec.read(f.codec.write(record));

		// Assert
		expect(f.codec).toBeInstanceOf(SocialJournalCodec);
		expect(saved).toEqual(record);
	});
	it.each([
		["credential field", { ...socialRecord(), token: "private-token" }],
		[
			"duplicate attempt",
			socialRecord([socialAttempt({ status: "rejected" }), socialAttempt()]),
		],
		[
			"unproven replay",
			socialRecord([socialAttempt(), socialAttempt({ id: "attempt-two" })]),
		],
		[
			"cross-workspace receipt",
			socialRecord([
				socialAttempt({
					status: "accepted",
					receipt: {
						provider: "slack",
						workspaceId: "T999",
						channelId: "C123",
						ts: "1234.5678",
					},
				}),
			]),
		],
		["missing receipt", socialRecord([socialAttempt({ status: "accepted" })])],
		[
			"receipt without acceptance",
			socialRecord([
				socialAttempt({
					receipt: {
						provider: "slack",
						workspaceId: "T123",
						channelId: "C123",
						ts: "1234.5678",
					},
				}),
			]),
		],
		["unsupported schema", { ...socialRecord(), purpose: "post-event" }],
		[
			"private post URL query",
			socialRecord([
				socialAttempt({
					status: "accepted",
					receipt: {
						provider: "slack",
						workspaceId: "T123",
						channelId: "C123",
						ts: "1234.5678",
						url: "https://app.slack.com/archives/C123/p12345678?token=private",
					},
				}),
			]),
		],
		[
			"recovery before reservation",
			socialRecord([
				socialAttempt({
					status: "uncertain",
					recovery: {
						actor: "organizer",
						decidedAt: "2026-10-01T10:00:00Z",
						outcome: "not-published",
						reference: "Verified channel history",
					},
				}),
			]),
		],
	])("rejects %s", (_label, value) => {
		// Arrange
		const f = socialJournalFixture();
		const body = `${SOCIAL_JOURNAL_MARKER}${JSON.stringify(value)} -->`;

		// Act
		const read = () => f.codec.read(body);

		// Assert
		expect(read).toThrow();
	});
	it("escapes comment delimiters in public labels", () => {
		// Arrange
		const f = socialJournalFixture();
		const record = socialRecord();
		const labelled = {
			...record,
			destination: {
				...record.destination,
				label: "Community --> <script> & channel",
			},
		};

		// Act
		const body = f.codec.write(labelled);
		const saved = f.codec.read(body);

		// Assert
		expect(body).not.toContain("<script>");
		expect(body.match(/-->/g)).toHaveLength(1);
		expect(saved).toEqual(labelled);
	});
});
