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
import { emailReviewFor } from "../testing/email-review.fixtures.js";
import { GithubOrganizerApprovalComposition } from "./dependency-composition.js";
import { EmailApprovalPresenter } from "./email-approval-presenter.js";
import { EmailDeliveryPresenter } from "./email-delivery-presenter.js";
import { ApprovalMessages } from "./i18n/approval-messages.js";

describe("approval request details", () => {
	it.each(["en", "fr"])(
		"renders collapsed readable email details in %s",
		(locale) => {
			// Arrange
			const presenter = new EmailApprovalPresenter(
				{
					deliveryPresenter: new EmailDeliveryPresenter(
						new GithubOrganizerApprovalComposition().approvalMessages("en"),
					),
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
					? "Remerciement à l&#39;intervenant"
					: "Speaker thank-you",
			);
			expect(body).toContain("Reliable platforms</a>");
			expect(body).toContain(
				'href="https://openfeedback.io/example/0/talk?displayVotes=true"',
			);
			expect(body).toContain(
				locale === "fr" ? "Détail des emails" : "Email details",
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
					deliveryPresenter: new EmailDeliveryPresenter(
						new GithubOrganizerApprovalComposition().approvalMessages("en"),
					),
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
				deliveryPresenter: new EmailDeliveryPresenter(
					new GithubOrganizerApprovalComposition().approvalMessages("en"),
				),
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
		expect(body).toContain("✅ Approved");
		expect(body).toContain("<details>");
		expect(body).toContain("Reliable platforms</a>");
		expect(body).not.toContain("- [ ]");
	});
});

describe.each(["en", "fr"])("scoped email review in %s", (locale) => {
	it.each(["host-thanks", "speaker-thanks"] as const)(
		"shows public parameters and recipient-specific details for %s",
		(kind) => {
			// Arrange
			const composition = new GithubOrganizerApprovalComposition();
			const presenter = composition.approvalPresenter(
				composition.approvalMessages(locale),
			);
			const record = createStoredApproval(emailReviewFor(kind));
			// Act
			const body = presenter.issue(record, { status: "pending" });
			// Assert
			expect(body).toContain(
				locale === "fr"
					? kind === "host-thanks"
						? "Email de remerciement — hôte"
						: "Emails de remerciement — intervenants"
					: kind === "host-thanks"
						? "Thank-you email — host"
						: "Thank-you emails — speakers",
			);
			expect(body).toContain("- `eventDate` : `2099-06-08`");
			expect(body).toContain(
				"- `eventSlidesUrl` : `https://docs.google.com/presentation/d/example/edit`",
			);
			expect(body).toContain("Example Host");
			if (kind === "speaker-thanks") {
				expect(body).toContain(
					'href="https://openfeedback.io/example/0/talk?displayVotes=true"',
				);
				expect(body).toContain("Reliable platforms</a>");
			}
			expect(body).not.toContain("## Post-event follow-up");
			expect(body).not.toContain("## Suivi après le meetup");
		},
	);
});
