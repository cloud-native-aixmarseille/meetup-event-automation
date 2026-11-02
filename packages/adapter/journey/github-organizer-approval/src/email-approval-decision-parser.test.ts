import { EmailReviewParameterPolicy } from "@meetup-automation/journey";
import { describe, expect, it } from "vitest";
import { createStoredApproval } from "../testing/approval.fixtures.js";
import { emailReviewRequest } from "../testing/email-review.fixtures.js";
import { GithubOrganizerApprovalComposition } from "./dependency-composition.js";
import { EmailApprovalDecisionParser } from "./email-approval-decision-parser.js";
import { EmailParametersPreview } from "./email-parameters-preview.js";

describe("editable email approvals", () => {
	it.each(["en", "fr"])(
		"approves edited public values while protecting the rest of the %s request",
		(locale) => {
			// Arrange
			const composition = new GithubOrganizerApprovalComposition();
			const presenter = composition.approvalPresenter(
				composition.approvalMessages(locale),
			);
			const record = createStoredApproval(emailReviewRequest);
			const parser = new EmailApprovalDecisionParser(
				new EmailParametersPreview(new EmailReviewParameterPolicy()),
			);
			const body = presenter
				.issue(record, { status: "approved" })
				.replace("`2099-06-08`", "`2099-06-09`");
			// Act
			const decision = parser.parse(record, body, [presenter]);
			// Assert
			expect(decision).toEqual({
				status: "approved",
				emailParameters: {
					...emailReviewRequest.details.parameters,
					eventDate: "2099-06-09",
				},
			});
		},
	);
	it.each(["metadata", "unsafe-url", "two-choices"])(
		"keeps %s edits unauthorized",
		(variant) => {
			// Arrange
			const composition = new GithubOrganizerApprovalComposition();
			const presenter = composition.approvalPresenter(
				composition.approvalMessages("en"),
			);
			const record = createStoredApproval(emailReviewRequest);
			const parser = new EmailApprovalDecisionParser(
				new EmailParametersPreview(new EmailReviewParameterPolicy()),
			);
			const valid = presenter.issue(record, { status: "approved" });
			const body =
				variant === "metadata"
					? valid.replace('"recipientCount":1', '"recipientCount":2')
					: variant === "unsafe-url"
						? valid.replace(
								"`https://www.meetup.com/example/events/123`",
								"`javascript:alert(1)`",
							)
						: valid.replace("- [ ] ❌", "- [x] ❌");
			// Act
			const decision = parser.parse(record, body, [presenter]);
			// Assert
			expect(decision.status).toBe("pending");
		},
	);
});
