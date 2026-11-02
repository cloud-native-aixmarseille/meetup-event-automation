import { EmailReviewParameterPolicy } from "@meetup-automation/journey";
import { describe, expect, it } from "vitest";
import { emailReviewRequest } from "../testing/email-review.fixtures.js";
import { EmailParametersPreview } from "./email-parameters-preview.js";

describe("email parameter Markdown", () => {
	it("round trips a code-formatted parameter list", () => {
		// Arrange
		const preview = new EmailParametersPreview(
			new EmailReviewParameterPolicy(),
		);
		const original = emailReviewRequest.details.parameters;
		// Act
		const body = preview.render(original);
		const values = preview.read(body, original);
		// Assert
		expect(body).toContain("- `eventDate` : `2099-06-08`");
		expect(values).toEqual(original);
	});
	it.each(["duplicate", "missing", "extra-key", "changed-key"])(
		"rejects %s parameter markup",
		(variant) => {
			// Arrange
			const preview = new EmailParametersPreview(
				new EmailReviewParameterPolicy(),
			);
			const original = emailReviewRequest.details.parameters;
			const valid = preview.render(original);
			const bodies = {
				duplicate: `${valid}\n${valid}`,
				missing: "",
				"extra-key": valid.replace(
					"<!-- /meetup-email:parameters -->",
					"- `email` : `other@example.test`\n<!-- /meetup-email:parameters -->",
				),
				"changed-key": valid.replace("`eventDate`", "`firstName`"),
			};
			// Act
			const read = () =>
				preview.read(bodies[variant as keyof typeof bodies], original);
			// Assert
			expect(read).toThrow();
		},
	);
});
