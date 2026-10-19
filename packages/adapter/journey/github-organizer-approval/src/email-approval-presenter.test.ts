import {
	ApprovalRequestPolicy,
	DraftProposalComposition,
} from "@meetup-automation/journey";
import { LocalizationComposition } from "@meetup-automation/localization";
import { describe, expect, it } from "vitest";
import {
	createStoredApproval,
	detailedRequest,
	request,
} from "../testing/approval.fixtures.js";
import { GithubOrganizerApprovalComposition } from "./dependency-composition.js";
import { EmailApprovalPresenter } from "./email-approval-presenter.js";
import { ApprovalMessages } from "./i18n/approval-messages.js";

describe("approval request details", () => {
	it.each(["en", "fr"])(
		"renders collapsed readable email details in %s",
		(locale) => {
			// Arrange
			const presenter = new EmailApprovalPresenter(
				{
					approvalRequestPolicy: new ApprovalRequestPolicy(
						new DraftProposalComposition().fingerprints(),
					),
					followUpPresenter:
						new GithubOrganizerApprovalComposition().followUpPresenter(
							new ApprovalMessages(
								{
									localeResolver:
										new LocalizationComposition().localeResolver(),
								},
								locale,
							),
						),
					approvalDetailsPresenter:
						new GithubOrganizerApprovalComposition().approvalDetailsPresenter(
							new ApprovalMessages(
								{
									localeResolver:
										new LocalizationComposition().localeResolver(),
								},
								locale,
							),
						),
				},
				new ApprovalMessages(
					{ localeResolver: new LocalizationComposition().localeResolver() },
					locale,
				),
			);
			const record = createStoredApproval(detailedRequest);
			if (
				record.kind !== "email-introduction" &&
				record.kind !== "email-thanks"
			)
				throw new Error("Expected email request");

			// Act
			const body = presenter.issue(record, { status: "pending" });

			// Assert
			expect(body).toContain("<details>\n<summary>");
			expect(body).not.toContain("<details open");
			expect(body).toContain("Alex Example");
			expect(body).toContain(
				locale === "fr"
					? "Remerciement pour l&#39;intervenant"
					: "Thank-you email for the speaker",
			);
			expect(body).toContain("Reliable platforms</a>");
			expect(body).toContain(
				'href="https://openfeedback.io/example/0/talk?displayVotes=true"',
			);
			expect(body).toContain(
				locale === "fr" ? "Voir le détail des e-mails" : "Review email details",
			);
		},
	);

	it.each(["-->", "--!>"])(
		"escapes the %s comment terminator in public text",
		(terminator) => {
			// Arrange
			const record = createStoredApproval({
				...detailedRequest,
				details: {
					...detailedRequest.details,
					emails: [
						{
							...detailedRequest.details.emails[0],
							recipientName: `${terminator}<img src=x> @person **name**`,
						},
					],
				},
			});
			if (
				record.kind !== "email-introduction" &&
				record.kind !== "email-thanks"
			)
				throw new Error("Expected email request");
			const presenter = new EmailApprovalPresenter(
				{
					approvalRequestPolicy: new ApprovalRequestPolicy(
						new DraftProposalComposition().fingerprints(),
					),
					followUpPresenter:
						new GithubOrganizerApprovalComposition().followUpPresenter(
							new ApprovalMessages({
								localeResolver: new LocalizationComposition().localeResolver(),
							}),
						),
					approvalDetailsPresenter:
						new GithubOrganizerApprovalComposition().approvalDetailsPresenter(
							new ApprovalMessages({
								localeResolver: new LocalizationComposition().localeResolver(),
							}),
						),
				},
				new ApprovalMessages({
					localeResolver: new LocalizationComposition().localeResolver(),
				}),
			);

			// Act
			const body = presenter.issue(record, { status: "pending" });

			// Assert
			expect(body).not.toContain("<img");
			expect(body.match(/--!?>/g)).toBeNull();
			expect(body).toContain("&lt;img src=x&gt; &#64;person");
		},
	);

	it("retains the reviewed details after the decision is recorded", () => {
		// Arrange
		const record = {
			...createStoredApproval(detailedRequest),
			decision: {
				status: "approved" as const,
				actor: "organizer",
				decidedAt: request.requestedAt,
			},
		};
		if (record.kind !== "email-introduction" && record.kind !== "email-thanks")
			throw new Error("Expected email request");
		const presenter = new EmailApprovalPresenter(
			{
				approvalRequestPolicy: new ApprovalRequestPolicy(
					new DraftProposalComposition().fingerprints(),
				),
				followUpPresenter:
					new GithubOrganizerApprovalComposition().followUpPresenter(
						new ApprovalMessages({
							localeResolver: new LocalizationComposition().localeResolver(),
						}),
					),
				approvalDetailsPresenter:
					new GithubOrganizerApprovalComposition().approvalDetailsPresenter(
						new ApprovalMessages({
							localeResolver: new LocalizationComposition().localeResolver(),
						}),
					),
			},
			new ApprovalMessages({
				localeResolver: new LocalizationComposition().localeResolver(),
			}),
		);

		// Act
		const body = presenter.issue(record, record.decision);

		// Assert
		expect(body).toContain("✅ **Approved**");
		expect(body).toContain("<details>");
		expect(body).toContain("Reliable platforms</a>");
		expect(body).not.toContain("- [ ]");
	});
});
