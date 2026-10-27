import type { EventDiagnostic } from "@meetup-automation/event";
import { JourneyPolicyComposition } from "@meetup-automation/journey";
import { LocalizationComposition } from "@meetup-automation/localization";
import { describe, expect, it } from "vitest";
import { GithubEventCommentRepositoryComposition } from "./dependency-composition.js";
import { DiagnosticCommentPresenter } from "./diagnostic-comment-presenter.js";
import { EVENT_DIAGNOSTIC_COMMENT_MARKER } from "./github-event-comment-repository-contracts.js";
import { EventCommentMessages } from "./i18n/event-comment-messages.js";

const errorDiagnostic: EventDiagnostic = {
	code: "event.date.invalid",
	severity: "error",
	category: "invalid",
	field: "date",
	message: "An address or other private value must never be rendered",
};

describe("renderDiagnosticComment", () => {
	it.each([
		[
			"en",
			"invalid-selection",
			"Enter distinct proposal numbers, one per line, from their Conference Hall URLs.",
		],
		[
			"fr",
			"invalid-selection",
			"Saisissez les numéros des URL Conference Hall, un par ligne, sans doublons.",
		],
		[
			"en",
			"not-found",
			"Proposal number not found in this CFP. Check its Conference Hall URL.",
		],
		[
			"fr",
			"not-found",
			"Numéro de proposition introuvable dans ce CFP. Vérifiez son URL Conference Hall.",
		],
	])(
		"explains proposal %s %s using visible numbers",
		(locale, code, guidance) => {
			// Arrange
			const messages = new EventCommentMessages(
				{ localeResolver: new LocalizationComposition().localeResolver() },
				locale,
			);
			const diagnostics = [
				{
					...errorDiagnostic,
					code: `event.proposals.${code}`,
					field: "agenda",
				},
			];

			// Act
			const body = new DiagnosticCommentPresenter({
				organizerDiagnosticPolicy:
					new JourneyPolicyComposition().organizerDiagnosticPolicy(),
				diagnosticPresenter:
					new GithubEventCommentRepositoryComposition().diagnosticPresenter(),
			}).render(diagnostics, messages);

			// Assert
			expect(body).toContain(guidance);
			expect(body).not.toContain(errorDiagnostic.message);
		},
	);

	it.each([
		["en", "Enter a valid HTTPS link to the OpenFeedback event page."],
		[
			"fr",
			"Saisissez un lien HTTPS valide vers la page de l'événement OpenFeedback.", // codespell:ignore valide
		],
	])(
		"renders feedback URL guidance in %s without exposing its value",
		(locale, guidance) => {
			// Arrange
			const messages = new EventCommentMessages(
				{ localeResolver: new LocalizationComposition().localeResolver() },
				locale,
			);
			const diagnostics = [
				{
					...errorDiagnostic,
					code: "event.link.feedback.invalid",
					field: "publicationLinks.feedback",
				},
			];

			// Act
			const body = new DiagnosticCommentPresenter({
				organizerDiagnosticPolicy:
					new JourneyPolicyComposition().organizerDiagnosticPolicy(),
				diagnosticPresenter:
					new GithubEventCommentRepositoryComposition().diagnosticPresenter(),
			}).render(diagnostics, messages);

			// Assert
			expect(body).toContain(`**OpenFeedback Link**: ${guidance}`);
			expect(body).not.toContain(errorDiagnostic.message);
		},
	);

	it("localizes guidance while retaining markers, issue headings and privacy boundaries", () => {
		// Arrange
		const messages = new EventCommentMessages(
			{ localeResolver: new LocalizationComposition().localeResolver() },
			"fr",
		);
		const diagnostics = [
			errorDiagnostic,
			{
				...errorDiagnostic,
				code: "unrecognized.code",
				field: "private@example.test",
			},
			{
				...errorDiagnostic,
				code: "event.agenda.speaker.missing",
				field: "agenda.0.speakers.1",
			},
		];

		// Act
		const body = new DiagnosticCommentPresenter({
			organizerDiagnosticPolicy:
				new JourneyPolicyComposition().organizerDiagnosticPolicy(),
			diagnosticPresenter:
				new GithubEventCommentRepositoryComposition().diagnosticPresenter(),
		}).render(diagnostics, messages);
		const resolved = new DiagnosticCommentPresenter({
			organizerDiagnosticPolicy:
				new JourneyPolicyComposition().organizerDiagnosticPolicy(),
			diagnosticPresenter:
				new GithubEventCommentRepositoryComposition().diagnosticPresenter(),
		}).render([], messages);

		// Assert
		expect(body).toContain(EVENT_DIAGNOSTIC_COMMENT_MARKER);
		expect(body).toContain("**Event Date**: Saisissez une date valide"); // codespell:ignore valide
		expect(body).toContain("**Programme (élément 1, intervenant 2)**");
		expect(body).toContain("Demandez à un responsable de consulter"); // codespell:ignore responsable
		expect(body).not.toContain("private@example.test");
		expect(body).not.toContain(errorDiagnostic.message);
		expect(resolved).toContain(EVENT_DIAGNOSTIC_COMMENT_MARKER);
		expect(resolved).toContain("✅ Informations complètes."); // codespell:ignore informations
	});

	it.each(["en", "fr"] as const)(
		"renders publication status guidance in %s",
		(locale) => {
			// Arrange
			const diagnostic: EventDiagnostic = {
				code: "publication.meetup.unpublished",
				severity: "warning",
				category: "incomplete",
				field: "publicationLinks.meetup",
				message: "Internal message",
			};
			const messages = new EventCommentMessages(
				{ localeResolver: new LocalizationComposition().localeResolver() },
				locale,
			);

			// Act
			const body = new DiagnosticCommentPresenter({
				organizerDiagnosticPolicy:
					new JourneyPolicyComposition().organizerDiagnosticPolicy(),
				diagnosticPresenter:
					new GithubEventCommentRepositoryComposition().diagnosticPresenter(),
			}).render([diagnostic, diagnostic], messages);

			// Assert
			expect(body).toContain("Meetup");
			expect(body).toContain(
				locale === "fr" ? "Approuvez ou refusez" : "Approve or reject",
			);
			expect(body.match(/- \[ \] \*\*Meetup Link/g)).toHaveLength(1);
			expect(body).not.toContain("Internal message");
		},
	);

	it("renders incomplete event fields as an actionable checklist in form order", () => {
		// Arrange
		const diagnostics = [
			"event.confirmation.speakers.missing",
			"event.description.missing",
			"event.title.missing",
			"publication.assets.missing",
			"publication.community.missing",
			"publication.meetup.missing",
		].map(
			(code): EventDiagnostic => ({
				code,
				severity: "warning",
				category: "incomplete",
				message: "Internal message",
			}),
		);

		// Act
		const body = new DiagnosticCommentPresenter({
			organizerDiagnosticPolicy:
				new JourneyPolicyComposition().organizerDiagnosticPolicy(),
			diagnosticPresenter:
				new GithubEventCommentRepositoryComposition().diagnosticPresenter(),
		}).render(
			diagnostics,
			new GithubEventCommentRepositoryComposition().eventCommentMessages("en"),
		);
		const actual = new DiagnosticCommentPresenter({
			organizerDiagnosticPolicy:
				new JourneyPolicyComposition().organizerDiagnosticPolicy(),
			diagnosticPresenter:
				new GithubEventCommentRepositoryComposition().diagnosticPresenter(),
		}).render(
			[...diagnostics].reverse(),
			new GithubEventCommentRepositoryComposition().eventCommentMessages("en"),
		);

		// Assert
		expect(body).toBe(`${EVENT_DIAGNOSTIC_COMMENT_MARKER}

- [ ] **Event Title**: Generate or submit the event title, then approve it for automatic application.
- [ ] **Event Description**: Generate or submit the event description, then approve it for automatic application.
- [ ] **Meetup Link**: Run event publication synchronization to populate the verified Meetup link.
- [ ] **CNCF Link**: Run event publication synchronization and approve CNCF / OCGroups publication; automation adds the verified public link.
- [ ] **Drive Link**: Run asset reconciliation to create the event folder and populate its Google Drive link.
- [ ] **Speaker confirmation**: Confirm the speakers, then add the \`speakers:confirmed\` label.`);
		expect(actual).toBe(body);
	});

	it("keeps separate corrections for fields and speakers sharing a diagnostic code", () => {
		// Arrange
		const logistics = {
			...errorDiagnostic,
			code: "event.logistics.intent.invalid",
		};
		const unknownSpeaker = {
			...errorDiagnostic,
			code: "referential.reference.speaker.unknown",
		};
		const diagnostics: EventDiagnostic[] = [
			{ ...logistics, field: "Restaurant / Bar" },
			{ ...logistics, field: "Aperitif" },
			{ ...logistics, field: "Aperitif" },
			{ ...unknownSpeaker, field: "speakerReferences[1]" },
			{ ...unknownSpeaker, field: "speakerReferences[0]" },
		];

		// Act
		const body = new DiagnosticCommentPresenter({
			organizerDiagnosticPolicy:
				new JourneyPolicyComposition().organizerDiagnosticPolicy(),
			diagnosticPresenter:
				new GithubEventCommentRepositoryComposition().diagnosticPresenter(),
		}).render(
			diagnostics,
			new GithubEventCommentRepositoryComposition().eventCommentMessages("en"),
		);

		// Assert
		expect(body.match(/^- \[ \]/gm)).toHaveLength(4);
		expect(body).toContain("**Aperitif**: Choose `Yes` or `No`");
		expect(body).toContain("**Restaurant / Bar**: Choose `Yes` or `No`");
		expect(body).toContain(
			"**Agenda (speaker 1)**: This speaker was not found",
		);
		expect(body).toContain(
			"**Agenda (speaker 2)**: This speaker was not found",
		);
		expect(body).toContain("including accents");
		expect(body).toContain("Speaker name [speaker-0001]");
	});

	it("locates malformed agenda entries and missing or duplicated form sections", () => {
		// Arrange
		const diagnostics: EventDiagnostic[] = [
			{
				...errorDiagnostic,
				code: "event.agenda.description.missing",
				field: "agenda.1.description",
			},
			{
				...errorDiagnostic,
				code: "event.agenda.speaker.invalid",
				field: "agenda.0.speakers.1",
			},
			{
				...errorDiagnostic,
				code: "event.document.heading.missing",
				field: "Event Title",
			},
			{
				...errorDiagnostic,
				code: "event.document.heading.duplicate",
				field: "Hoster",
			},
			{
				...errorDiagnostic,
				code: "event.document.checkbox.invalid",
				field: "Post event",
			},
		];

		// Act
		const body = new DiagnosticCommentPresenter({
			organizerDiagnosticPolicy:
				new JourneyPolicyComposition().organizerDiagnosticPolicy(),
			diagnosticPresenter:
				new GithubEventCommentRepositoryComposition().diagnosticPresenter(),
		}).render(
			diagnostics,
			new GithubEventCommentRepositoryComposition().eventCommentMessages("en"),
		);

		// Assert
		expect(body).toContain("**Event Title**: Restore this section heading");
		expect(body).toContain("**Hoster**: Keep a single section");
		expect(body).toContain(
			"**Agenda (item 1, speaker 2)**: Enter a speaker name",
		);
		expect(body).toContain("**Agenda (item 2)**: Add a talk description");
		expect(body).toContain("**Post event**: Use `- [ ] Task`");
	});

	it("never copies raw messages, arbitrary fields, or diagnostic codes into comments", () => {
		// Arrange
		const diagnostics: EventDiagnostic[] = [
			{
				...errorDiagnostic,
				code: "alice@example.com",
				field: "<script>alert(1)</script> @everyone",
				message: "alice@example.com lives at 1 Private Street",
			},
			{
				...errorDiagnostic,
				code: "referential.contact.email.invalid",
				field: "hosts[0].contacts[0].email",
			},
			{
				...errorDiagnostic,
				code: "referential.reference.speaker.unknown",
				field: "speakerReferences[0]<img>",
			},
			{ ...errorDiagnostic, code: "event.date.invalid" },
			{ ...errorDiagnostic, code: "event.date.invalid" },
		];

		// Act
		const body = new DiagnosticCommentPresenter({
			organizerDiagnosticPolicy:
				new JourneyPolicyComposition().organizerDiagnosticPolicy(),
			diagnosticPresenter:
				new GithubEventCommentRepositoryComposition().diagnosticPresenter(),
		}).render(
			diagnostics,
			new GithubEventCommentRepositoryComposition().eventCommentMessages("en"),
		);

		// Assert
		expect(body).toContain(EVENT_DIAGNOSTIC_COMMENT_MARKER);
		expect(body).toContain("**Event Date**: Enter a valid calendar date");
		expect(body).toContain("**Referentials**: Ask a maintainer to correct");
		expect(body).toContain(
			"**Meetup issue**: Ask a maintainer to review the workflow diagnostics.",
		);
		expect(body).not.toContain("alice@example.com");
		expect(body).not.toContain("Private Street");
		expect(body).not.toContain("<script>");
		expect(body).not.toContain("<img>");
		expect(body).not.toContain("@everyone");
		expect(body).not.toContain("hosts[0]");
		expect(body).not.toContain(errorDiagnostic.message);
		expect(body).not.toContain("event.date.invalid");
		expect(body.match(/\*\*Event Date\*\*/g)).toHaveLength(1);
	});

	it("treats informational diagnostics as resolved", () => {
		// Arrange
		const diagnostics: EventDiagnostic[] = [
			{ ...errorDiagnostic, severity: "info", code: "event.date.normalized" },
		];

		// Act
		const body = new DiagnosticCommentPresenter({
			organizerDiagnosticPolicy:
				new JourneyPolicyComposition().organizerDiagnosticPolicy(),
			diagnosticPresenter:
				new GithubEventCommentRepositoryComposition().diagnosticPresenter(),
		}).render(
			diagnostics,
			new GithubEventCommentRepositoryComposition().eventCommentMessages("en"),
		);

		// Assert
		expect(body).toContain("✅ Event details complete.");
		expect(body).not.toContain("event.date.normalized");
	});
});
