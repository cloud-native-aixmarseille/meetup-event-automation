import { describe, expect, it } from "vitest";
import { EmailReviewParameterPolicy } from "./email-review-parameters.js";

describe("public email review parameters", () => {
	it("projects only public template values", () => {
		// Arrange
		const policy = new EmailReviewParameterPolicy();
		const source = {
			eventDate: "2099-06-08",
			eventMeetupUrl: "https://example.test/event",
			email: "private@example.test",
			firstName: "Private",
			phone: "private",
		};
		// Act
		const parameters = policy.project(source);
		// Assert
		expect(parameters).toEqual({
			eventDate: source.eventDate,
			eventMeetupUrl: source.eventMeetupUrl,
		});
	});
	it.each([
		{ eventDate: "2099-02-30" },
		{ eventMeetupUrl: "javascript:alert(1)" },
		{ eventMeetupUrl: "https://user:password@example.test/event" },
		{ eventMeetupUrl: "https://example.test/\nspoof" },
		{ email: "another@example.test" },
	])("rejects unsafe or private fields %j", (parameters) => {
		// Arrange
		const policy = new EmailReviewParameterPolicy();
		// Act
		const validate = () => policy.validate(parameters);
		// Assert
		expect(validate).toThrow("Invalid email review parameter");
	});
	it("does not allow an edit to remove a required template value", () => {
		// Arrange
		const policy = new EmailReviewParameterPolicy();
		// Act
		const validate = () => policy.validateEdit({ eventDate: "2099-06-08" }, {});
		// Assert
		expect(validate).toThrow("keys cannot change");
	});
});
