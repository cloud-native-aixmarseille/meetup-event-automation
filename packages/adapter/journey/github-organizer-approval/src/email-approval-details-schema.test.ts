import type { OrganizerApprovalDetails } from "@meetup-automation/journey";
import { EmailReviewParameterPolicy } from "@meetup-automation/journey";
import { emailReviewFor } from "../testing/email-review.fixtures.js";
import { describe, expect, it } from "vitest";
import { GithubOrganizerApprovalComposition } from "./dependency-composition.js";
import { EmailApprovalDetailsSchema } from "./email-approval-details-schema.js";

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
		const validate = () =>
			new EmailApprovalDetailsSchema({
				parameterPolicy: new EmailReviewParameterPolicy(),
				approvalSchema:
					new GithubOrganizerApprovalComposition().approvalSchema(),
			}).validate(input);

		// Assert
		expect(validate).toThrow("Invalid approval details");
	});

	it("accepts omitted-email counts in a bounded summary", () => {
		// Arrange
		const input = { ...details, omittedEmails: 4 };

		// Act
		const validate = () =>
			new EmailApprovalDetailsSchema({
				parameterPolicy: new EmailReviewParameterPolicy(),
				approvalSchema:
					new GithubOrganizerApprovalComposition().approvalSchema(),
			}).validate(input);

		// Assert
		expect(validate).not.toThrow();
	});
});

describe("scoped email details", () => {
	it.each([
		"host-introduction",
		"speaker-introduction",
		"host-thanks",
		"speaker-thanks",
	] as const)("rejects mixed email kinds within %s", (kind) => {
		// Arrange
		const input = emailReviewFor(kind).details;
		const schema = new EmailApprovalDetailsSchema({
			parameterPolicy: new EmailReviewParameterPolicy(),
			approvalSchema: new GithubOrganizerApprovalComposition().approvalSchema(),
		});
		// Act
		const valid = () => schema.validate(input);
		const mixed = () =>
			schema.validate({
				...input,
				mailKind: kind === "host-thanks" ? "speaker-thanks" : "host-thanks",
			});
		// Assert
		expect(valid).not.toThrow();
		expect(mixed).toThrow("Invalid email approval scope");
	});
});
