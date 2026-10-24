import { LocalizationComposition } from "@meetup-automation/localization";
import { describe, expect, it } from "vitest";
import {
	communityRequest,
	createStoredApproval,
} from "../testing/approval.fixtures.js";
import { CommunityApprovalPresenter } from "./community-approval-presenter.js";
import { ApprovalMessages } from "./i18n/approval-messages.js";

describe("OCGroups publication approval presentation", () => {
	it.each(["en", "fr"])(
		"shows the draft and publication controls in %s",
		(locale) => {
			// Arrange
			const presenter = new CommunityApprovalPresenter(
				new ApprovalMessages(
					{ localeResolver: new LocalizationComposition().localeResolver() },
					locale,
				),
			);
			const record = createStoredApproval(communityRequest);
			if (record.kind !== "community-publication")
				throw new Error("Expected publication request");

			// Act
			const body = presenter.issue(record, { status: "pending" });

			// Assert
			expect(body).toContain(communityRequest.publication.url);
			expect(body).toContain("18:45–20:45 (Europe/Paris)");
			expect(body).toContain(
				locale === "en"
					? "- [ ] Approve publishing this CNCF community event"
					: "- [ ] Approuver la publication de cet événement CNCF",
			);
			expect(body).not.toContain("recipients");
		},
	);
	it("escapes markup and mentions in displayed facts", () => {
		// Arrange
		const presenter = new CommunityApprovalPresenter(
			new ApprovalMessages(
				{ localeResolver: new LocalizationComposition().localeResolver() },
				"en",
			),
		);
		const record = createStoredApproval({
			...communityRequest,
			publication: {
				...communityRequest.publication,
				title: "@organizer **Title** <script>",
			},
		});
		if (record.kind !== "community-publication")
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
