import { describe, expect, it } from "vitest";
import { emailReviewFor } from "../testing/email-review.fixtures.js";
import { ApprovalDetailsPresenter } from "./approval-details-presenter.js";
import { GithubOrganizerApprovalComposition } from "./dependency-composition.js";
import { EmailParametersPreview } from "./email-parameters-preview.js";
import { EmailReviewParameterPolicy } from "@meetup-automation/journey";

describe.each([
	"host-introduction",
	"speaker-introduction",
	"host-thanks",
	"speaker-thanks",
] as const)("complete %s preview", (kind) => {
	it.each(["en", "fr"])(
		"shows literal delivery values and escapes content in %s",
		(locale) => {
			// Arrange
			const details = emailReviewFor(kind).details;
			if (!details?.emails[0]?.message) throw new Error("Missing fixture");
			const email = details.emails[0];
			const message = details.emails[0].message;
			const input = {
				...details,
				emails: [
					{
						...email,
						message: {
							...message,
							placeholders: {
								...message.placeholders,
								firstName: "<script>@someone</script>\n`literal`",
								speakerFeedbackTalks: [
									{ title: "A & B", url: "https://example.test/?a=1&b=2" },
								],
							},
						},
					},
				],
			};
			const presenter = new ApprovalDetailsPresenter(
				new EmailParametersPreview(new EmailReviewParameterPolicy()),
				new GithubOrganizerApprovalComposition().approvalMessages(locale),
			);
			// Act
			const body = presenter.render(input);
			// Assert
			expect(body).toContain(
				"&quot;to-email&quot;: &quot;contact&#64;example.test&quot;",
			);
			expect(body).toContain(
				`&quot;template-name&quot;: &quot;${message.templateName}&quot;`,
			);
			expect(body).toContain(
				"&quot;idempotency-key&quot;: &quot;mail-example&quot;",
			);
			expect(body).toContain(
				"&lt;script&gt;&#64;someone&lt;/script&gt;\\n`literal`",
			);
			expect(body).toContain("A &amp; B");
			expect(body).toContain("https://example.test/?a=1&amp;b=2");
			expect(body).not.toContain("<script>");
		},
	);

	it("applies reviewed shared values without replacing recipient overrides", () => {
		// Arrange
		const details = emailReviewFor(kind).details;
		if (!details?.emails[0]?.message) throw new Error("Missing fixture");
		const email = details.emails[0];
		const message = details.emails[0].message;
		const input = {
			...details,
			parameters: { ...details.parameters, eventDate: "2099-07-01" },
			emails: [
				email,
				{
					...email,
					message: {
						...message,
						recipientEmail: "second@example.test",
						parameterKeys: [],
						placeholders: { ...message.placeholders, eventDate: "2099-06-10" },
					},
				},
			],
		};
		const presenter =
			new GithubOrganizerApprovalComposition().approvalDetailsPresenter(
				new GithubOrganizerApprovalComposition().approvalMessages("en"),
			);
		// Act
		const body = presenter.render(input);
		// Assert
		expect(body).toContain("&quot;eventDate&quot;: &quot;2099-07-01&quot;");
		expect(body).toContain("&quot;eventDate&quot;: &quot;2099-06-10&quot;");
		expect(body).toContain("second&#64;example.test");
	});
});
