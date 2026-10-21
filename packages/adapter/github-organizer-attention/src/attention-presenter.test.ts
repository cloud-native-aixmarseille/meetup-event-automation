import { CommunicationDomainComposition } from "@meetup-automation/communication";
import { LocalizationComposition } from "@meetup-automation/localization";
import { describe, expect, it } from "vitest";
import { episode, state } from "../testing/attention.fixtures.js";
import { AttentionDiagnosticChecklist } from "./attention-diagnostic-checklist.js";
import { AttentionPresenter } from "./attention-presenter.js";
import { GithubOrganizerAttentionComposition } from "./dependency-composition.js";
import { AttentionMessages } from "./i18n/attention-messages.js";

describe("GitHub attention presentation", () => {
	it("keeps supplied metadata separate from localized task formatting", () => {
		// Arrange
		const checklist = new AttentionDiagnosticChecklist({
			createAttentionMessages: (...args) =>
				new GithubOrganizerAttentionComposition().attentionMessages(...args),
		});
		const presenter = new AttentionPresenter(
			{
				attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
				attentionTaskSelection:
					new CommunicationDomainComposition().attentionTaskSelection(),
				createAttentionMessages: (...args) =>
					new GithubOrganizerAttentionComposition().attentionMessages(...args),
			},
			"example/meetups",
			42,
			checklist,
		);
		const value = {
			...state(),
			post: undefined,
			episodes: [
				episode("integration-failure", "unknown-one"),
				episode("integration-failure", "unknown-two"),
			],
		};

		// Act
		const body = presenter.issue(value, "<!-- opaque metadata -->");

		// Assert
		expect(body).toContain("<!-- opaque metadata -->");
		expect(body.match(/Automation failed: review the issue/g)).toHaveLength(1);
	});
	it.each([
		["approval-pending", "Approve or reject the email batch."],
		["delivery-recovery", "Verify delivery before retrying."],
	] as const)("keeps one concrete %s task", (code, action) => {
		// Arrange
		const checklist = new AttentionDiagnosticChecklist({
			createAttentionMessages: (...args) =>
				new GithubOrganizerAttentionComposition().attentionMessages(...args),
		});
		const presenter = new AttentionPresenter(
			{
				attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
				attentionTaskSelection:
					new CommunicationDomainComposition().attentionTaskSelection(),
				createAttentionMessages: (...args) =>
					new GithubOrganizerAttentionComposition().attentionMessages(...args),
			},
			"example/meetups",
			42,
			checklist,
		);
		checklist.set(
			100,
			`<!-- meetup-automation:event-diagnostics:v1 -->\n\n- [ ] **Communication**: ${action}`,
		);
		const value = { ...state(), post: undefined, episodes: [episode(code)] };

		// Act
		const body = presenter.issue(value, "");

		// Assert
		expect(body.split(action)).toHaveLength(2);
	});
	it("preserves existing concrete guidance and only adds distinct work", () => {
		// Arrange
		const checklist = new AttentionDiagnosticChecklist({
			createAttentionMessages: (...args) =>
				new GithubOrganizerAttentionComposition().attentionMessages(...args),
		});
		const presenter = new AttentionPresenter(
			{
				attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
				attentionTaskSelection:
					new CommunicationDomainComposition().attentionTaskSelection(),
				createAttentionMessages: (...args) =>
					new GithubOrganizerAttentionComposition().attentionMessages(...args),
			},
			"example/meetups",
			42,
			checklist,
			new AttentionMessages(
				{ localeResolver: new LocalizationComposition().localeResolver() },
				"fr",
			),
		);
		const prefix =
			"<!-- meetup-automation:event-diagnostics:v1 -->\n\n- [ ] **Event Title**: Ajoutez un titre.\n- [ ] **Host confirmation**: Confirmez l'hôte.";
		checklist.set(100, prefix);
		const value = {
			...state(),
			post: undefined,
			episodes: [
				episode("required-data", "event"),
				episode("host-confirmation", "host"),
				episode("manual-publication", "public-slack-local"),
			],
		};

		// Act
		const body = presenter.issue(value, "");

		// Assert
		expect(body.startsWith(prefix)).toBe(true);
		expect(body.match(/Confirmez/g)).toHaveLength(1);
		expect(body).toContain("Publiez l'annonce sur le Slack local");
	});
	it("shows pending notification recovery without claiming the event is clear", () => {
		// Arrange
		const checklist = new AttentionDiagnosticChecklist({
			createAttentionMessages: (...args) =>
				new GithubOrganizerAttentionComposition().attentionMessages(...args),
		});
		const presenter = new AttentionPresenter(
			{
				attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
				attentionTaskSelection:
					new CommunicationDomainComposition().attentionTaskSelection(),
				createAttentionMessages: (...args) =>
					new GithubOrganizerAttentionComposition().attentionMessages(...args),
			},
			"example/meetups",
			42,
			checklist,
		);

		// Act
		const body = presenter.details({ ...state(), stopped: true });

		// Assert
		expect(body).toContain(
			"- [ ] Verify the Slack post before retrying: delivery is unconfirmed.",
		);
		expect(body).not.toContain("No pending tasks.");
	});
	it("keeps unknown tasks alongside a concrete action", () => {
		// Arrange
		const checklist = new AttentionDiagnosticChecklist({
			createAttentionMessages: (...args) =>
				new GithubOrganizerAttentionComposition().attentionMessages(...args),
		});
		const presenter = new AttentionPresenter(
			{
				attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
				attentionTaskSelection:
					new CommunicationDomainComposition().attentionTaskSelection(),
				createAttentionMessages: (...args) =>
					new GithubOrganizerAttentionComposition().attentionMessages(...args),
			},
			"example/meetups",
			42,
			checklist,
		);
		checklist.set(
			100,
			"<!-- meetup-automation:event-diagnostics:v1 -->\n\n- [ ] **Communication**: Verify delivery before retrying.",
		);
		const recovery = episode("delivery-recovery");
		recovery.status = "unknown";

		// Act
		const body = presenter.details({
			...state(),
			post: undefined,
			episodes: [recovery],
		});

		// Assert
		expect(body).toContain("status unverified");
	});
});
