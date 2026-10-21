import { LocalizationComposition } from "@meetup-automation/localization";
import { describe, expect, it } from "vitest";
import {
	createStoredApproval,
	publicationRequest,
} from "../testing/approval.fixtures.js";
import { GithubOrganizerApprovalComposition } from "./dependency-composition.js";
import { ApprovalMessages } from "./i18n/approval-messages.js";
import { MeetupApprovalPresenter } from "./meetup-approval-presenter.js";

describe("Meetup publication approval presentation", () => {
	it.each(["en", "fr"])(
		"shows the draft and publication controls in %s",
		(locale) => {
			// Arrange
			const presenter = new MeetupApprovalPresenter(
				{
					approvalCommentCodec:
						new GithubOrganizerApprovalComposition().approvalCommentCodec(),
				},
				new ApprovalMessages(
					{ localeResolver: new LocalizationComposition().localeResolver() },
					locale,
				),
			);
			const record = createStoredApproval(publicationRequest);
			if (record.kind !== "meetup-publication")
				throw new Error("Expected publication request");

			// Act
			const body = presenter.issue(record, { status: "pending" });

			// Assert
			expect(body).toContain(publicationRequest.publication.url);
			expect(body).toContain("18:45–20:45 (Europe/Paris)");
			expect(body).toContain(
				locale === "en"
					? "- [ ] Approve publishing this Meetup event"
					: "- [ ] Approuver la publication de ce meetup",
			);
			expect(body).not.toContain("recipients");
		},
	);
	it("escapes markup and mentions in displayed facts", () => {
		// Arrange
		const presenter = new MeetupApprovalPresenter(
			{
				approvalCommentCodec:
					new GithubOrganizerApprovalComposition().approvalCommentCodec(),
			},
			new ApprovalMessages(
				{ localeResolver: new LocalizationComposition().localeResolver() },
				"en",
			),
		);
		const record = createStoredApproval({
			...publicationRequest,
			publication: {
				...publicationRequest.publication,
				title: "@organizer **Title** <script>",
			},
		});
		if (record.kind !== "meetup-publication")
			throw new Error("Expected publication request");

		// Act
		const body = presenter
			.issue(record, { status: "pending" })
			.split("\n")
			.slice(1)
			.join("\n");

		// Assert
		expect(body).not.toContain("@organizer");
		expect(body).not.toContain("<script>");
		expect(body).toContain("&lt;script&gt;");
	});
});
