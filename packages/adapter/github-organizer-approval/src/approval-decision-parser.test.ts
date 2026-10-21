import { LocalizationComposition } from "@meetup-automation/localization";
import { describe, expect, it } from "vitest";
import {
	createStoredApproval,
	detailedRequest,
	publicationRequest,
	request,
} from "../testing/approval.fixtures.js";
import { ApprovalDecisionParser } from "./approval-decision-parser.js";
import { ApprovalPresenter } from "./approval-presenter.js";
import { GithubOrganizerApprovalComposition } from "./dependency-composition.js";
import { ApprovalMessages } from "./i18n/approval-messages.js";

describe("approval decision parsing", () => {
	it.each(
		["en", "fr"].flatMap((locale) =>
			[detailedRequest, publicationRequest].flatMap((input) =>
				(["approved", "rejected"] as const).map((status) => ({
					locale,
					input,
					status,
				})),
			),
		),
	)("reads $input.kind $status in $locale", ({ locale, input, status }) => {
		// Arrange
		const record = createStoredApproval(input);
		const presenter = new ApprovalPresenter(
			{
				createEmailApprovalPresenter: (...args) =>
					new GithubOrganizerApprovalComposition().emailApprovalPresenter(
						...args,
					),
				createMeetupApprovalPresenter: (...args) =>
					new GithubOrganizerApprovalComposition().meetupApprovalPresenter(
						...args,
					),
			},
			new ApprovalMessages(
				{ localeResolver: new LocalizationComposition().localeResolver() },
				locale,
			),
		);
		const body = presenter
			.issue(record, { status })
			.replace(/- \[x\]/g, "- [X]")
			.replace(/\n/g, "\r\n");
		const parser = new ApprovalDecisionParser(
			new GithubOrganizerApprovalComposition()
				.approvalPresenterFactory()
				.supportedLocales(),
		);

		// Act
		const decision = parser.parse(record, body);

		// Assert
		expect(decision).toEqual({ status });
	});

	it("rejects a changed displayed feedback destination", () => {
		// Arrange
		const record = createStoredApproval(detailedRequest);
		const presenter = new ApprovalPresenter(
			{
				createEmailApprovalPresenter: (...args) =>
					new GithubOrganizerApprovalComposition().emailApprovalPresenter(
						...args,
					),
				createMeetupApprovalPresenter: (...args) =>
					new GithubOrganizerApprovalComposition().meetupApprovalPresenter(
						...args,
					),
			},
			new ApprovalMessages(
				{ localeResolver: new LocalizationComposition().localeResolver() },
				"en",
			),
		);
		const body = presenter
			.issue(record, { status: "approved" })
			.replace(
				'href="https://openfeedback.io/example/0/talk?displayVotes=true"',
				'href="https://example.invalid/different"',
			);
		const parser = new ApprovalDecisionParser(
			new GithubOrganizerApprovalComposition()
				.approvalPresenterFactory()
				.supportedLocales(),
		);

		// Act
		const decision = parser.parse(record, body);

		// Assert
		expect(decision.status).toBe("pending");
	});

	it.each(["both", "neither", "changed metadata"] as const)(
		"keeps the request pending for %s",
		(variant) => {
			// Arrange
			const record = createStoredApproval(request);
			const presenter = new ApprovalPresenter(
				{
					createEmailApprovalPresenter: (...args) =>
						new GithubOrganizerApprovalComposition().emailApprovalPresenter(
							...args,
						),
					createMeetupApprovalPresenter: (...args) =>
						new GithubOrganizerApprovalComposition().meetupApprovalPresenter(
							...args,
						),
				},
				new ApprovalMessages(
					{ localeResolver: new LocalizationComposition().localeResolver() },
					"en",
				),
			);
			const approved = presenter.issue(record, { status: "approved" });
			const bodies = {
				both: approved.replace("- [ ] Reject", "- [x] Reject"),
				neither: presenter.issue(record, { status: "pending" }),
				"changed metadata": approved.replace(record.revision, "b".repeat(64)),
			};
			const parser = new ApprovalDecisionParser(
				new GithubOrganizerApprovalComposition()
					.approvalPresenterFactory()
					.supportedLocales(),
			);

			// Act
			const decision = parser.parse(record, bodies[variant]);

			// Assert
			expect(decision.status).toBe("pending");
		},
	);
});
