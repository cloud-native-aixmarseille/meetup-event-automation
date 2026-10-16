import type { OrganizerApprovalDetails } from "@meetup-automation/journey";
import { describe, expect, it } from "vitest";
import { ApprovalDetails } from "./approval-details.js";

const details: OrganizerApprovalDetails = {
	emails: [
		{
			kind: "speaker-introduction",
			recipientName: "Alex Example",
			links: [
				{
					kind: "slides",
					url: "https://docs.google.com/presentation/d/example/edit",
				},
			],
			omittedLinks: 0,
		},
	],
	omittedEmails: 0,
};

describe("approval detail validation", () => {
	it.each([
		"javascript:alert(1)",
		"http://example.test/slides",
		"https://user:password@example.test/slides",
		"https://example.test/\nslides",
	])("rejects unsafe detail links: %s", (url) => {
		// Arrange
		const input = {
			...details,
			emails: [
				{ ...details.emails[0], links: [{ kind: "slides" as const, url }] },
			],
		} as OrganizerApprovalDetails;

		// Act
		const validate = () => ApprovalDetails.validate(input, 1);

		// Assert
		expect(validate).toThrow("Invalid approval details");
	});

	it("rejects a summary that accounts for fewer emails than the batch", () => {
		// Arrange
		const recipientCount = 2;

		// Act
		const validate = () => ApprovalDetails.validate(details, recipientCount);

		// Assert
		expect(validate).toThrow("Invalid approval details");
	});

	it("accepts omitted-email counts in a bounded summary", () => {
		// Arrange
		const input = { ...details, omittedEmails: 4 };

		// Act
		const validate = () => ApprovalDetails.validate(input, 5);

		// Assert
		expect(validate).not.toThrow();
	});
});
