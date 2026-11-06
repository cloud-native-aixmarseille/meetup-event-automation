import { describe, expect, it } from "vitest";
import {
	createStoredApproval,
	slidesRequest,
} from "../testing/approval.fixtures.js";
import { GithubOrganizerApprovalComposition } from "./dependency-composition.js";
import { MeetupSlidesApprovalPresenter } from "./meetup-slides-approval-presenter.js";

describe("attendee slides review", () => {
	it.each(["en", "fr"])(
		"shows the PDF, audience and distinct send controls in %s",
		(locale) => {
			// Arrange
			const presenter = new MeetupSlidesApprovalPresenter(
				new GithubOrganizerApprovalComposition().approvalMessages(locale),
			);
			const record = createStoredApproval(slidesRequest);
			if (record.kind !== "meetup-slides")
				throw new Error("Expected attendee slides approval");

			// Act
			const body = presenter.issue(record, { status: "pending" });

			// Assert
			expect(body).toContain(slidesRequest.slides.pdfUrl);
			expect(body).toContain(slidesRequest.slides.eventUrl);
			expect(body).toContain(locale === "fr" ? "présents" : "attended");
			expect(body).toContain(
				locale === "fr"
					? "- [ ] ✅ Approuver l'envoi"
					: "- [ ] ✅ Approve sending",
			);
			expect(body).toContain(
				locale === "fr"
					? "- [ ] ❌ Refuser l'envoi"
					: "- [ ] ❌ Reject sending",
			);
		},
	);
});
