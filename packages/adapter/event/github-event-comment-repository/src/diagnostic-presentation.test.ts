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
	it.each(["en", "fr"])(
		"explains a slides conflict with file, recovery and rerun links in %s",
		(locale) => {
			// Arrange
			const messages = new EventCommentMessages(
				{ localeResolver: new LocalizationComposition().localeResolver() },
				locale,
			);
			const item = {
				...diagnostic,
				code: "publication.assets.content.conflict",
				field: "assets.content/slides_123/slides",
			};

			// Act
			const result = new DiagnosticPresenter().presentDiagnostic(
				item,
				messages,
				{ repository: "example/meetups" },
			);

			// Assert
			expect(result.field).toBe("Event materials");
			expect(result.message).toContain(
				"https://drive.google.com/file/d/slides_123/view",
			);
			expect(result.message).toContain("#recover-a-content-conflict");
			expect(result.message).toContain(
				"example/meetups/actions/workflows/event-reconcile-active.yml",
			);
			expect(result.message).toContain(
				locale === "fr" ? "emails de remerciement" : "thank-you emails",
			);
			expect(result.message).toContain(
				locale === "fr" ? "préserve les ajouts" : "preserves manual additions",
			);
			expect(result.message).not.toContain(diagnostic.message);
		},
	);
	it.each([
		"assets",
		"assets.content/private@example.test/slides",
		"assets.content/](https://evil.test)/slides",
	])(
		"does not turn an unverified conflict location into a link: %s",
		(field) => {
			// Arrange
			const messages = new EventCommentMessages(
				{ localeResolver: new LocalizationComposition().localeResolver() },
				"en",
			);
			const item = {
				...diagnostic,
				code: "publication.assets.content.conflict",
				field,
			};

			// Act
			const result = new DiagnosticPresenter().presentDiagnostic(
				item,
				messages,
				{ repository: "example/meetups" },
			);

			// Assert
			expect(result.message).toContain("rerun synchronization");
			expect(result.message).not.toContain("drive.google.com");
			expect(result.message).not.toContain("private@example.test");
			expect(result.message).not.toContain("evil.test");
		},
	);
	it.each(["en", "fr"])(
		"identifies the missing reminder in %s without exposing raw diagnostics",
		(locale) => {
			// Arrange
			const messages = new EventCommentMessages(
				{ localeResolver: new LocalizationComposition().localeResolver() },
				locale,
			);
			const item = {
				...diagnostic,
				code: "communication.social.missing",
				field: "social.engineering.d0",
			};
			// Act
			const result = new DiagnosticPresenter().presentDiagnostic(
				item,
				messages,
				{ repository: "example/meetups" },
			);
			// Assert
			expect(result.field).toContain("engineering");
			expect(result.field).toContain("d0");
			expect(result.message).toContain(locale === "fr" ? "brouillon" : "draft");
			expect(result.message).not.toContain(diagnostic.message);
		},
	);
	it.each([
		["en", "host-logo", "Host logo", "invalid"],
		["fr", "host-logo", "Logo de l'hôte", "invalides"],
		["en", "speaker-picture", "Speaker photo", "invalid"],
		["fr", "speaker-picture", "Photo de l'intervenant", "invalides"],
		["en", "cover", "Approved generated cover", "maintainer"],
		["fr", "cover", "Visuel de couverture généré et approuvé", "mainteneur"],
	])(
		"identifies the document and %s %s image without blaming the folder link",
		(locale, kind, label, reason) => {
			// Arrange
			const messages = new EventCommentMessages(
				{ localeResolver: new LocalizationComposition().localeResolver() },
				locale,
			);
			const item = {
				...diagnostic,
				code: "publication.assets.content.image-format",
				field: `assets.image/document_123/${kind}/portrait-2`,
			};
			// Act
			const result = new DiagnosticPresenter().presentDiagnostic(
				item,
				messages,
				{ repository: "example/meetups" },
			);
			// Assert
			expect(result.field).toBe("Event materials");
			expect(result.message).toContain(label);
			expect(result.message).toContain(reason);
			expect(result.message).toContain("`portrait-2`");
			expect(result.message).toContain(
				"https://drive.google.com/file/d/document_123/view",
			);
			expect(result.message).not.toContain(diagnostic.message);
		},
	);
	it.each([
		"publicationLinks.assets",
		"assets.image/document/host-logo/private@example.test",
		"assets.image/document/host-logo/](https://evil.test)",
	])("does not expose an unrecognized image location: %s", (field) => {
		// Arrange
		const messages = new EventCommentMessages(
			{ localeResolver: new LocalizationComposition().localeResolver() },
			"en",
		);
		const item = {
			...diagnostic,
			code: "publication.assets.content.image",
			field,
		};
		// Act
		const result = new DiagnosticPresenter().presentDiagnostic(item, messages, {
			repository: "example/meetups",
		});
		// Assert
		expect(result.field).toBe("Event materials");
		expect(result.message).toContain("identify the image and failure reason");
		expect(result.message).not.toContain(field);
		expect(result.message).not.toContain(diagnostic.message);
	});
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
			"Ask a maintainer",
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
