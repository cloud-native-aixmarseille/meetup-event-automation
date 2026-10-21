import type { EventDiagnostic } from "@meetup-automation/event";
import { LocalizationComposition } from "@meetup-automation/localization";
import { describe, expect, it } from "vitest";
import { GithubEventCommentRepositoryComposition } from "./dependency-composition.js";
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
			const result = new DiagnosticPresenter({
				createEventCommentMessages: (...args) =>
					new GithubEventCommentRepositoryComposition().eventCommentMessages(
						...args,
					),
			}).presentDiagnostic(
				item,
				new EventCommentMessages(
					{ localeResolver: new LocalizationComposition().localeResolver() },
					locale,
				),
			);

			// Assert
			expect(result.field).toBe(field);
			expect(result.message).toContain(text);
			expect(result.message).not.toContain(item.message);
		},
	);
});
