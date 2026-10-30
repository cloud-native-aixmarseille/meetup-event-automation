import { describe, expect, it } from "vitest";
import { createStoredApproval } from "../testing/approval.fixtures.js";
import { socialPublicationRequest } from "../testing/social-publication.fixtures.js";
import { GithubOrganizerApprovalComposition } from "./dependency-composition.js";
import { SocialPublicationApprovalPresenter } from "./social-publication-approval-presenter.js";

describe("social publication approval preview", () => {
	it.each([
		["en", "after approval"],
		["fr", "après approbation"],
	])("localizes an immediate announcement window in %s", (locale, expected) => {
		// Arrange
		const record = createStoredApproval({
			...socialPublicationRequest,
			social: {
				...socialPublicationRequest.social,
				plannedAt: "after-approval",
			},
		});
		if (record.kind !== "social-publication")
			throw new Error("Expected social publication");
		const presenter = new SocialPublicationApprovalPresenter(
			new GithubOrganizerApprovalComposition().approvalMessages(locale),
		);

		// Act
		const body = presenter.issue(record, { status: "pending" });

		// Assert
		expect(body).toContain(expected);
		expect(body).not.toContain("after-approval");
	});
	it.each(["en", "fr"])(
		"shows the exact destination, public text, and delivery window in %s",
		(locale) => {
			// Arrange
			const record = createStoredApproval({
				...socialPublicationRequest,
				social: {
					...socialPublicationRequest.social,
					text: "<img>\n@everyone\nhttps://www.meetup.com/example/events/12345/",
				},
			});
			if (record.kind !== "social-publication")
				throw new Error("Expected social publication");
			const presenter = new SocialPublicationApprovalPresenter(
				new GithubOrganizerApprovalComposition().approvalMessages(locale),
			);

			// Act
			const body = presenter.issue(record, { status: "approved" });

			// Assert
			expect(body).toContain("T123/C123");
			expect(body).toContain("2099-06-01T10:00:00Z");
			expect(body).toContain("2099-06-08T16:30:00Z");
			expect(body).toContain(
				"<pre>&lt;img&gt;\n&#64;everyone\nhttps://www.meetup.com/example/events/12345/</pre>",
			);
			expect(body.match(/- \[x\]/g)).toHaveLength(1);
			expect(body.match(/- \[ \]/g)).toHaveLength(1);
		},
	);
	it.each(["published", "not-published"] as const)(
		"asks organizers to confirm recovery evidence for %s",
		(outcome) => {
			// Arrange
			const record = createStoredApproval({
				...socialPublicationRequest,
				social: {
					...socialPublicationRequest.social,
					recovery: {
						outcome,
						reference: "Verified provider history for this exact channel",
					},
				},
			});
			if (record.kind !== "social-publication")
				throw new Error("Expected social publication");
			const presenter = new SocialPublicationApprovalPresenter(
				new GithubOrganizerApprovalComposition().approvalMessages("en"),
			);

			// Act
			const body = presenter.issue(record, { status: "pending" });

			// Assert
			expect(body).toContain(
				"Verified provider history for this exact channel",
			);
			expect(body).toContain("Keep publication blocked");
			expect(body).toContain(
				outcome === "published"
					? "save the post ID"
					: "allow a retry with valid approval",
			);
		},
	);
});
