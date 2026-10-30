import {
	ApprovalRequestPolicy,
	DraftProposalComposition,
} from "@meetup-automation/journey";
import { LocalizationComposition } from "@meetup-automation/localization";
import { describe, expect, it } from "vitest";
import {
	communityRequest,
	createStoredApproval,
	detailedRequest,
	publicationRequest,
	request,
} from "../testing/approval.fixtures.js";
import { contentRequest, coverRequest } from "../testing/content.fixtures.js";
import { socialPublicationRequest } from "../testing/social-publication.fixtures.js";
import { ApprovalDecisionParser } from "./approval-decision-parser.js";
import { ApprovalPresenter } from "./approval-presenter.js";
import { CommunityApprovalPresenter } from "./community-approval-presenter.js";
import { ContentTextPreview } from "./content-text-preview.js";
import { GithubOrganizerApprovalComposition } from "./dependency-composition.js";
import { ApprovalMessages } from "./i18n/approval-messages.js";
import { SocialPublicationApprovalPresenter } from "./social-publication-approval-presenter.js";

describe("approval decision parsing", () => {
	it.each(["en", "fr"])(
		"verifies exact social publication checkbox decisions in %s",
		(locale) => {
			// Arrange
			const composition = new GithubOrganizerApprovalComposition();
			const record = createStoredApproval(socialPublicationRequest);
			const presenter = composition.approvalPresenter(
				composition.approvalMessages(locale),
			);
			const parser = new ApprovalDecisionParser(
				new ContentTextPreview(),
				new ApprovalRequestPolicy(
					new DraftProposalComposition().fingerprints(),
				),
				composition.approvalPresenterFactory().supportedLocales(),
			);
			const body = presenter.issue(record, { status: "approved" });

			// Act
			const result = parser.parse(record, body);
			const changed = parser.parse(
				record,
				body.replaceAll("T123/C123", "T123/C999"),
			);

			// Assert
			expect(result).toEqual({ status: "approved" });
			expect(changed).toEqual({ status: "pending" });
		},
	);
	it.each(
		["en", "fr"].flatMap((locale) =>
			[detailedRequest, publicationRequest, communityRequest].flatMap((input) =>
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
			new GithubOrganizerApprovalComposition().approvalCommentCodec(),
			{
				"email-introduction":
					new GithubOrganizerApprovalComposition().emailApprovalPresenter(
						new ApprovalMessages(
							{
								localeResolver: new LocalizationComposition().localeResolver(),
							},
							locale,
						),
					),
				"email-thanks":
					new GithubOrganizerApprovalComposition().emailApprovalPresenter(
						new ApprovalMessages(
							{
								localeResolver: new LocalizationComposition().localeResolver(),
							},
							locale,
						),
					),
				"social-publication": new SocialPublicationApprovalPresenter(
					new GithubOrganizerApprovalComposition().approvalMessages("en"),
				),
				"content-review":
					new GithubOrganizerApprovalComposition().contentApprovalPresenter(
						new GithubOrganizerApprovalComposition().approvalMessages("en"),
					),
				"community-publication": new CommunityApprovalPresenter(
					new GithubOrganizerApprovalComposition().approvalMessages("en"),
				),
				"meetup-publication":
					new GithubOrganizerApprovalComposition().meetupApprovalPresenter(
						new ApprovalMessages(
							{
								localeResolver: new LocalizationComposition().localeResolver(),
							},
							locale,
						),
					),
			},
		);
		const body = presenter
			.issue(record, { status })
			.replace(/- \[x\]/g, "- [X]")
			.replace(/\n/g, "\r\n");
		const parser = new ApprovalDecisionParser(
			new ContentTextPreview(),
			new ApprovalRequestPolicy(new DraftProposalComposition().fingerprints()),
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
			new GithubOrganizerApprovalComposition().approvalCommentCodec(),
			{
				"email-introduction":
					new GithubOrganizerApprovalComposition().emailApprovalPresenter(
						new ApprovalMessages(
							{
								localeResolver: new LocalizationComposition().localeResolver(),
							},
							"en",
						),
					),
				"email-thanks":
					new GithubOrganizerApprovalComposition().emailApprovalPresenter(
						new ApprovalMessages(
							{
								localeResolver: new LocalizationComposition().localeResolver(),
							},
							"en",
						),
					),
				"social-publication": new SocialPublicationApprovalPresenter(
					new GithubOrganizerApprovalComposition().approvalMessages("en"),
				),
				"content-review":
					new GithubOrganizerApprovalComposition().contentApprovalPresenter(
						new GithubOrganizerApprovalComposition().approvalMessages("en"),
					),
				"community-publication": new CommunityApprovalPresenter(
					new GithubOrganizerApprovalComposition().approvalMessages("en"),
				),
				"meetup-publication":
					new GithubOrganizerApprovalComposition().meetupApprovalPresenter(
						new ApprovalMessages(
							{
								localeResolver: new LocalizationComposition().localeResolver(),
							},
							"en",
						),
					),
			},
		);
		const body = presenter
			.issue(record, { status: "approved" })
			.replace(
				'href="https://openfeedback.io/example/0/talk?displayVotes=true"',
				'href="https://example.invalid/different"',
			);
		const parser = new ApprovalDecisionParser(
			new ContentTextPreview(),
			new ApprovalRequestPolicy(new DraftProposalComposition().fingerprints()),
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
				new GithubOrganizerApprovalComposition().approvalCommentCodec(),
				{
					"email-introduction":
						new GithubOrganizerApprovalComposition().emailApprovalPresenter(
							new ApprovalMessages(
								{
									localeResolver:
										new LocalizationComposition().localeResolver(),
								},
								"en",
							),
						),
					"email-thanks":
						new GithubOrganizerApprovalComposition().emailApprovalPresenter(
							new ApprovalMessages(
								{
									localeResolver:
										new LocalizationComposition().localeResolver(),
								},
								"en",
							),
						),
					"social-publication": new SocialPublicationApprovalPresenter(
						new GithubOrganizerApprovalComposition().approvalMessages("en"),
					),
					"content-review":
						new GithubOrganizerApprovalComposition().contentApprovalPresenter(
							new GithubOrganizerApprovalComposition().approvalMessages("en"),
						),
					"community-publication": new CommunityApprovalPresenter(
						new GithubOrganizerApprovalComposition().approvalMessages("en"),
					),
					"meetup-publication":
						new GithubOrganizerApprovalComposition().meetupApprovalPresenter(
							new ApprovalMessages(
								{
									localeResolver:
										new LocalizationComposition().localeResolver(),
								},
								"en",
							),
						),
				},
			);
			const approved = presenter.issue(record, { status: "approved" });
			const bodies = {
				both: approved.replace("- [ ] Reject", "- [x] Reject"),
				neither: presenter.issue(record, { status: "pending" }),
				"changed metadata": approved.replace(record.revision, "b".repeat(64)),
			};
			const parser = new ApprovalDecisionParser(
				new ContentTextPreview(),
				new ApprovalRequestPolicy(
					new DraftProposalComposition().fingerprints(),
				),
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

describe("content decision parsing", () => {
	it.each(["en", "fr"])("accepts exact content choices in %s", (locale) => {
		// Arrange
		const composition = new GithubOrganizerApprovalComposition();
		const record = createStoredApproval(contentRequest);
		const presenter = composition.approvalPresenter(
			composition.approvalMessages(locale),
		);
		const parser = new ApprovalDecisionParser(
			new ContentTextPreview(),
			new ApprovalRequestPolicy(new DraftProposalComposition().fingerprints()),
			composition.approvalPresenterFactory().supportedLocales(),
		);
		const body = presenter.issue(record, { status: "iteration-requested" });
		// Act
		const result = parser.parse(record, body);
		// Assert
		expect(result).toEqual({ status: "iteration-requested" });
	});
	it.each(["Changed content", "First paragraph\n\nLiteral - [X] text & &#91;"])(
		"accepts exact text replacement and approval: %s",
		(text) => {
			// Arrange
			const composition = new GithubOrganizerApprovalComposition();
			const record = createStoredApproval(contentRequest);
			const presenter = composition.approvalPresenter(
				composition.approvalMessages("en"),
			);
			const parser = new ApprovalDecisionParser(
				new ContentTextPreview(),
				new ApprovalRequestPolicy(
					new DraftProposalComposition().fingerprints(),
				),
				[presenter],
			);
			const body =
				new ContentTextPreview().replace(
					presenter
						.issue(record, { status: "approved" })
						.replace("- [x] ✅ Approve", "- [X] ✅ Approve"),
					text,
				) ?? "";
			// Act
			const result = parser.parse(record, body);
			// Assert
			expect(result).toEqual({
				status: "approved",
				editedText: text,
			});
		},
	);
	it("rejects multiple cover choices", () => {
		// Arrange
		const composition = new GithubOrganizerApprovalComposition();
		const record = createStoredApproval(coverRequest);
		const presenter = composition.approvalPresenter(
			composition.approvalMessages("en"),
		);
		const parser = new ApprovalDecisionParser(
			new ContentTextPreview(),
			new ApprovalRequestPolicy(new DraftProposalComposition().fingerprints()),
			[presenter],
		);
		const body = presenter
			.issue(record, { status: "approved", selectedImage: "image-2" })
			.replace("- [ ] ✅ Choose image 1", "- [x] ✅ Choose image 1");
		// Act
		const result = parser.parse(record, body);
		// Assert
		expect(result.status).toBe("pending");
	});
});

describe("edited proposal integrity", () => {
	it.each([
		"metadata",
		"multiple choices",
		"changed controls",
		"changed heading",
	])("rejects a text edit with %s", (variant) => {
		// Arrange
		const composition = new GithubOrganizerApprovalComposition();
		const record = createStoredApproval(contentRequest);
		const presenter = composition.approvalPresenter(
			composition.approvalMessages("en"),
		);
		const preview = new ContentTextPreview();
		const parser = new ApprovalDecisionParser(
			preview,
			new ApprovalRequestPolicy(new DraftProposalComposition().fingerprints()),
			[presenter],
		);
		const edited =
			preview.replace(
				presenter.issue(record, { status: "approved" }),
				"Organizer title",
			) ?? "";
		const bodies: Record<string, string> = {
			metadata: edited.replace(record.revision, "b".repeat(64)),
			"multiple choices": edited.replace("- [ ] ❌ Reject", "- [x] ❌ Reject"),
			"changed controls": edited.replace("- [x] ✅ Approve", "- [x] Publish"),
			"changed heading": edited.replace(
				"### Meetup title",
				"### Different target",
			),
		};
		// Act
		const result = parser.parse(record, bodies[variant] ?? "");
		// Assert
		expect(result).toEqual({ status: "pending" });
	});
});
