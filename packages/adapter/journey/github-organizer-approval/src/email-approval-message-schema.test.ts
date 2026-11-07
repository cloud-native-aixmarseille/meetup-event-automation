import { describe, expect, it } from "vitest";
import { emailReviewRequest } from "../testing/email-review.fixtures.js";
import { ApprovalSchema } from "./approval-schema.js";
import { EmailApprovalMessageSchema } from "./email-approval-message-schema.js";

const message = emailReviewRequest.details.emails[0].message;
describe("complete email message schema", () => {
	it.each([
		{ ...message, recipientEmail: "invalid" },
		{ ...message, templateName: "unknown" },
		{ ...message, placeholders: { name: 42 } },
		{ ...message, placeholders: { speakerFeedbackTalks: [{ title: "Talk" }] } },
		{
			...message,
			placeholders: {
				speakerFeedbackTalks: [
					{ title: "Talk", url: "https://example.test", hidden: "value" },
				],
			},
		},
		{ ...message, parameterKeys: ["eventDate", "eventDate"] },
		{ ...message, secret: "unexpected" },
	])("rejects malformed outgoing values %#", (input) => {
		// Arrange
		const schema = new EmailApprovalMessageSchema(new ApprovalSchema());
		// Act
		const valid = schema.valid(input);
		// Assert
		expect(valid).toBe(false);
	});
	it("rejects an editable value that differs from the outgoing message", () => {
		// Arrange
		const schema = new EmailApprovalMessageSchema(new ApprovalSchema());
		// Act
		const validate = () =>
			schema.validateParameters(message, {
				...emailReviewRequest.details.parameters,
				eventDate: "2099-07-01",
			});
		// Assert
		expect(validate).toThrow("Invalid email message parameters");
	});
});
