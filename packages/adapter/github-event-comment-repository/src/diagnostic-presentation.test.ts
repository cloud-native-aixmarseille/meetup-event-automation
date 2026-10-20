import type { EventDiagnostic } from "@meetup-automation/event";
import { describe, expect, it } from "vitest";
import { DiagnosticPresenter } from "./diagnostic-presentation.js";
import { EventCommentMessages } from "./i18n/event-comment-messages.js";

const diagnostic: EventDiagnostic = {
	code: "communication.feedback-fetch-failed",
	severity: "error",
	category: "invalid",
	message: "private@example.test",
};

describe("organizer diagnostic presentation", () => {
	it.each([
		[
			"en",
			"communication.missing-mail-destination",
			"Communication",
			"Add an email address",
		],
		[
			"fr",
			"communication.missing-mail-destination",
			"Communication",
			"Ajoutez une adresse courriel", // codespell:ignore adresse
		],
		[
			"en",
			"communication.feedback-fetch-failed",
			"OpenFeedback Link",
			"Check OpenFeedback access",
		],
		[
			"en",
			"publication.assets.content.conflict",
			"Slides & Content",
			"Review manual edits",
		],
	])(
		"renders concrete %s %s guidance without private data",
		(locale, code, field, text) => {
			// Arrange
			const item = { ...diagnostic, code };

			// Act
			const result = DiagnosticPresenter.presentDiagnostic(
				item,
				new EventCommentMessages(locale),
			);

			// Assert
			expect(result.field).toBe(field);
			expect(result.message).toContain(text);
			expect(result.message).not.toContain(item.message);
		},
	);

	it.each([
		["publication.assets.prerequisites", "event.date.missing"],
		["publication.feedback.agenda", "event.proposals.not-found"],
		["communication.feedback-unavailable", "publication.feedback.agenda"],
		["communication.slides-unavailable", "publication.assets.content.conflict"],
	])("hides derivative %s when %s explains its cause", (code, cause) => {
		// Arrange
		const item = { ...diagnostic, code };
		const diagnostics = [item, { ...diagnostic, code: cause }];

		// Act
		const suppressed = DiagnosticPresenter.suppressed(item, diagnostics);

		// Assert
		expect(suppressed).toBe(true);
	});

	it("keeps prerequisite guidance when its cause was not reported", () => {
		// Arrange
		const item = { ...diagnostic, code: "publication.assets.prerequisites" };

		// Act
		const suppressed = DiagnosticPresenter.suppressed(item, [item]);

		// Assert
		expect(suppressed).toBe(false);
	});
});
