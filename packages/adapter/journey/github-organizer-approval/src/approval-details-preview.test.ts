import type { OrganizerApprovalDetails } from "@meetup-automation/journey";
import { describe, expect, it } from "vitest";
import { ApprovalDetailsPreview } from "./approval-details-preview.js";

describe("GitHub approval preview budget", () => {
	it("bounds the comment while retaining the full omitted email and link counts", () => {
		// Arrange
		const details: OrganizerApprovalDetails = {
			emails: Array.from({ length: 30 }, () => ({
				kind: "speaker-thanks",
				recipientName: "Alex Example",
				omittedLinks: 1,
				links: Array.from({ length: 12 }, (_, index) => ({
					kind: "feedback",
					title: `Talk ${index}`,
					url: `https://example.test/${"a".repeat(1500)}-${index}`,
				})),
			})),
			omittedEmails: 2,
		};

		// Act
		const preview = new ApprovalDetailsPreview().create(details);

		// Assert
		expect(preview.emails.length + preview.omittedEmails).toBe(32);
		expect(preview.omittedEmails).toBeGreaterThan(2);
		expect(JSON.stringify(preview.emails).length).toBeLessThanOrEqual(4000);
		for (const email of preview.emails)
			expect(email.links.length + email.omittedLinks).toBe(13);
		expect(details.emails).toHaveLength(30);
		expect(details.emails[0]?.links).toHaveLength(12);
	});

	it("normalizes multiline public labels and truncates long display text", () => {
		// Arrange
		const details: OrganizerApprovalDetails = {
			emails: [
				{
					kind: "speaker-thanks",
					recipientName: ` Alex\n${"a".repeat(200)} `,
					links: [
						{
							kind: "feedback",
							url: "https://example.test/feedback",
							title: "A\nB",
						},
					],
					omittedLinks: 0,
				},
			],
			omittedEmails: 0,
		};

		// Act
		const preview = new ApprovalDetailsPreview().create(details);

		// Assert
		expect(preview.emails[0]?.recipientName).toHaveLength(200);
		expect(preview.emails[0]?.recipientName).toMatch(/^Alex a+\.\.\.$/);
		expect(preview.emails[0]?.links[0]?.title).toBe("A B");
	});
});
