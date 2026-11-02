import type { EventDiagnostic } from "@meetup-automation/event";
import { LocalizationComposition } from "@meetup-automation/localization";
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
	it.each(["fr", "en"])(
		"links the event and the consumer workflow in %s",
		(locale) => {
			// Arrange
			const messages = new EventCommentMessages(
				{ localeResolver: new LocalizationComposition().localeResolver() },
				locale,
			);
			const item = { ...diagnostic, code: "publication.meetup.uncertain" };
			const links = {
				repository: "organizers/event-issues",
				meetup: "https://www.meetup.com/example/events/42/",
			};

			// Act
			const result = new DiagnosticPresenter().presentDiagnostic(
				item,
				messages,
				links,
			);

			// Assert
			expect(result.message).toContain(`](${links.meetup})`);
			expect(result.message).toContain(
				"](https://github.com/organizers/event-issues/actions/workflows/event-reconcile-active.yml)",
			);
			expect(result.message).toContain('"Run workflow"');
			expect(result.message).not.toContain('"Meetup Link"');
			expect(result.message).not.toContain(item.message);
		},
	);
	it.each(["fr", "en"])(
		"reports an unavailable event link while keeping the workflow link in %s",
		(locale) => {
			// Arrange
			const messages = new EventCommentMessages(
				{ localeResolver: new LocalizationComposition().localeResolver() },
				locale,
			);
			const item = { ...diagnostic, code: "publication.meetup.uncertain" };

			// Act
			const result = new DiagnosticPresenter().presentDiagnostic(
				item,
				messages,
				{ repository: "organizers/event-issues" },
			);

			// Assert
			expect(result.message).toContain(
				locale === "fr" ? "Aucun lien" : "No valid Meetup event link",
			);
			expect(result.message).toContain(
				"](https://github.com/organizers/event-issues/actions/workflows/event-reconcile-active.yml)",
			);
			expect(result.message).not.toContain("www.meetup.com");
			expect(result.message).not.toContain("undefined");
		},
	);
	it("escapes Markdown delimiters in link destinations", () => {
		// Arrange
		const messages = new EventCommentMessages(
			{ localeResolver: new LocalizationComposition().localeResolver() },
			"en",
		);
		const item = { ...diagnostic, code: "publication.meetup.uncertain" };

		// Act
		const result = new DiagnosticPresenter().presentDiagnostic(item, messages, {
			repository: "example/meetups",
			meetup: "https://events(example).test/group/events/42/",
		});

		// Assert
		expect(result.message).toContain(
			"](https://events%28example%29.test/group/events/42/)",
		);
	});
	it.each([
		[
			"en",
			"communication.social.evaluation-failed",
			"Communication",
			"Check source access and delivery records",
		],
		[
			"fr",
			"communication.social.evaluation-failed",
			"Communication",
			"Vérifiez les accès aux sources et le registre", // codespell:ignore registre
		],
		[
			"en",
			"publication.assets.pdf.conflict",
			"Event materials",
			"shared public folder",
		],
		[
			"fr",
			"publication.assets.pdf.conflict",
			"Event materials",
			"dossier public partagé",
		],
		[
			"en",
			"publication.assets.pdf.sharing",
			"Event materials",
			"Keep the folder restricted",
		],
		[
			"fr",
			"publication.assets.pdf.sharing",
			"Event materials",
			"Gardez le dossier restreint",
		],
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
			"Ajoutez une adresse email", // codespell:ignore adresse
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
			"Event materials",
			"Review manual edits",
		],
	])(
		"renders concrete %s %s guidance without private data",
		(locale, code, field, text) => {
			// Arrange
			const item = { ...diagnostic, code };

			// Act
			const result = new DiagnosticPresenter().presentDiagnostic(
				item,
				new EventCommentMessages(
					{ localeResolver: new LocalizationComposition().localeResolver() },
					locale,
				),
				{ repository: "example/meetups" },
			);

			// Assert
			expect(result.field).toBe(field);
			expect(result.message).toContain(text);
			expect(result.message).not.toContain(item.message);
		},
	);
});
