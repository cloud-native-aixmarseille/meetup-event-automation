import { describe, expect, it } from "vitest";
import { episode, state } from "../testing/attention.fixtures.js";
import { AttentionPresenter } from "./attention-presenter.js";
import { AttentionMessages } from "./i18n/attention-messages.js";

describe("localized attention projection", () => {
	it("deduplicates repeated actions in both destinations", () => {
		// Arrange
		const presenter = new AttentionPresenter("example/meetups", 42);
		const conditions = [
			episode("integration-failure", "unknown-one"),
			episode("integration-failure", "unknown-two"),
		];
		const value = { ...state(), post: undefined, episodes: conditions };

		// Act
		const slack = presenter.render({ state: value, conditions });
		const issue = presenter.issue(value);

		// Assert
		expect(slack.match(/Automation failed: review the issue/g)).toHaveLength(1);
		expect(issue.match(/Automation failed: review the issue/g)).toHaveLength(1);
	});

	it("marks concrete checklist actions as pending even without a generic condition", () => {
		// Arrange
		const presenter = new AttentionPresenter("example/meetups", 42);
		presenter.setDiagnosticComment(
			100,
			"<!-- meetup-automation:event-diagnostics:v1 -->\n\n- [ ] **Communication**: Add a recipient address.",
		);

		// Act
		const slack = presenter.render({ state: state(), conditions: [] });

		// Assert
		expect(slack).toContain("⚠️");
		expect(slack).toContain("• Communication: Add a recipient address.");
		expect(slack).not.toContain("No pending tasks.");
	});
	it("retains concrete blockers alongside post-event approval tasks", () => {
		// Arrange
		const presenter = new AttentionPresenter("example/meetups", 42);
		presenter.setDiagnosticComment(
			100,
			"<!-- meetup-automation:event-diagnostics:v1 -->\n\n- [ ] **OpenFeedback Link**: Synchronize each talk.",
		);
		const value = { ...state(), commentId: 200 };

		// Act
		const slack = presenter.render({
			state: value,
			conditions: [episode("approval-pending")],
		});

		// Assert
		expect(slack).toContain("• Approve or reject the email batch.");
		expect(slack).toContain("• OpenFeedback Link: Synchronize each talk.");
	});
	it.each([
		["approval-pending", "Approve or reject the email batch."],
		["delivery-recovery", "Verify delivery before retrying."],
	] as const)(
		"shows one %s action and keeps its direct Slack link",
		(code, action) => {
			// Arrange
			const presenter = new AttentionPresenter("example/meetups", 42);
			presenter.setDiagnosticComment(
				100,
				`<!-- meetup-automation:event-diagnostics:v1 -->\n\n- [ ] **Communication**: ${action}`,
			);
			const approval = episode(code);
			approval.condition = { ...approval.condition, commentId: 200 };
			const value = { ...state(), post: undefined, episodes: [approval] };

			// Act
			const slack = presenter.render({ state: value, conditions: [approval] });
			const issue = presenter.issue(value);

			// Assert
			expect(slack.split(action)).toHaveLength(2);
			expect(slack).toContain("#issuecomment-200|Review details");
			expect(issue.split(action)).toHaveLength(2);
		},
	);
	it.each([
		[
			"en",
			"Jun 8, 2099",
			"Email preparation or delivery failed.",
			"Review run",
		],
		[
			"fr",
			"8 juin 2099",
			"La préparation ou l'envoi des courriels a échoué.",
			"Voir l'exécution",
		],
	])(
		"renders a compact linked heading and action in %s",
		(locale, date, action, link) => {
			// Arrange
			const presenter = new AttentionPresenter(
				"example/meetups",
				42,
				new AttentionMessages(locale),
			);
			const value = { ...state(), runId: "1234" };

			// Act
			const rendered = presenter.render({
				state: value,
				conditions: [episode()],
			});

			// Assert
			expect(rendered).toBe(
				[
					`⚠️ *<https://github.com/example/meetups/issues/42|Meetup #42>* · ${date}`,
					"",
					`• ${action} · <https://github.com/example/meetups/actions/runs/1234|${link}>`,
				].join("\n"),
			);
		},
	);
	it.each([
		["en", "+2 more tasks → View all"],
		["fr", "+2 autres tâches → Tout voir"],
	])(
		"bounds Slack to six actions with a linked overflow count in %s",
		(locale, overflow) => {
			// Arrange
			const presenter = new AttentionPresenter(
				"example/meetups",
				42,
				new AttentionMessages(locale),
			);
			const conditions = [
				episode("integration-failure", "communications"),
				episode("integration-failure", "assets"),
				episode("integration-failure", "feedback"),
				episode("host-confirmation"),
				episode("speaker-confirmation"),
				episode("missing-date"),
				episode("delivery-recovery"),
				episode("manual-publication", "public-social"),
			];
			const value = { ...state(), post: undefined, episodes: conditions };

			// Act
			const rendered = presenter.render({ state: value, conditions });
			const issue = presenter.issue(value);

			// Assert
			expect(rendered.split("•")).toHaveLength(7);
			expect(rendered).toContain(
				`<https://github.com/example/meetups/issues/42|${overflow}>`,
			);
			expect(issue.match(/^- /gm)).toHaveLength(8);
		},
	);
	it.each(["", "2099-02-31", "<!channel>"])(
		"omits a missing or invalid date (%s)",
		(eventDate) => {
			// Arrange
			const presenter = new AttentionPresenter("example/meetups", 42);
			const value = { ...state(), eventDate };

			// Act
			const rendered = presenter.render({
				state: value,
				conditions: [episode("missing-date")],
			});

			// Assert
			expect(rendered).toBe(
				"⚠️ *<https://github.com/example/meetups/issues/42|Meetup #42>*\n\n• Set the event date.",
			);
		},
	);
	it("links directly to a recovery record and retains unverified status without lifecycle boilerplate", () => {
		// Arrange
		const presenter = new AttentionPresenter("example/meetups", 42);
		const recovery = episode("delivery-recovery", "private-delivery-key");
		recovery.condition = {
			...recovery.condition,
			commentId: 123,
			recovery: true,
		};
		recovery.status = "unknown";
		const value = { ...state(), stopped: true };

		// Act
		const rendered = presenter.render({ state: value, conditions: [recovery] });

		// Assert
		expect(rendered).toContain(
			"• Verify delivery before retrying. _(status unverified)_ · <https://github.com/example/meetups/issues/42#issuecomment-123|Review details>",
		);
		expect(rendered).not.toContain("Task reminders stopped");
		expect(rendered).not.toContain("private-delivery-key");
	});
	it("keeps an occurrence decision on one action line without repeating the issue link", () => {
		// Arrange
		const presenter = new AttentionPresenter("example/meetups", 42);

		// Act
		const rendered = presenter.render({
			state: state(),
			conditions: [episode("occurrence-decision")],
		});

		// Assert
		expect(rendered).toContain(
			"• Date passed: mark held, postponed, or cancelled.",
		);
		expect(rendered.match(/https:\/\/github.com/g)).toHaveLength(1);
		expect(rendered).not.toContain("Review the full issue status");
	});
	it("renders the resolved state for an existing message", () => {
		// Arrange
		const presenter = new AttentionPresenter("example/meetups", 42);

		// Act
		const rendered = presenter.render({ state: state(), conditions: [] });

		// Assert
		expect(rendered).toBe(
			"✅ *<https://github.com/example/meetups/issues/42|Meetup #42>* · Jun 8, 2099\n\nNo pending tasks.",
		);
	});
	it("does not allow external identifiers to inject Slack links or mentions", () => {
		// Arrange
		const presenter = new AttentionPresenter("example/meetups", 42);
		const value = { ...state(), runId: "123|run> <!channel>" };
		const failure = episode("integration-failure", "<!channel>");
		failure.condition = { ...failure.condition, commentId: -1 };

		// Act
		const rendered = presenter.render({ state: value, conditions: [failure] });

		// Assert
		expect(rendered).not.toContain("<!channel>");
		expect(rendered).not.toContain("actions/runs/");
		expect(rendered).not.toContain("issuecomment-");
		expect(rendered).toContain("Automation failed: review the issue.");
	});
	it("shows detailed recovery on GitHub while Slack acknowledgement remains pending", () => {
		// Arrange
		const presenter = new AttentionPresenter("example/meetups", 42);
		const value = { ...state(), stopped: true };

		// Act
		const rendered = presenter.issue(value);

		// Assert
		expect(rendered).toContain(
			"- [ ] Verify the Slack post before retrying: delivery is unconfirmed.",
		);
		expect(rendered).not.toContain("Task reminders stopped");
		expect(rendered).not.toContain("No pending tasks.");
	});
	it("shows the concrete checklist in Slack and adds only distinct tasks to its comment", () => {
		// Arrange
		const presenter = new AttentionPresenter(
			"example/meetups",
			42,
			new AttentionMessages("fr"),
		);
		const checklist =
			"<!-- meetup-automation:event-diagnostics:v1 -->\n\n- [ ] **Event Title**: Ajoutez un titre.\n- [ ] **Agenda**: Proposition Conference Hall introuvable.\n- [ ] **Host confirmation**: Confirmez l'hôte.";
		presenter.setDiagnosticComment(100, checklist);
		const conditions = [
			episode("required-data", "event"),
			episode("host-confirmation", "host"),
			episode("manual-publication", "public-slack-local"),
		];
		const value = { ...state(), post: undefined, episodes: conditions };
		// Act
		const slack = presenter.render({ state: value, conditions });
		const comment = presenter.issue(value);
		// Assert
		expect(slack).toContain("#issuecomment-100|Meetup #42");
		expect(slack).toContain(
			"• Agenda: Proposition Conference Hall introuvable.\n• Event Title: Ajoutez un titre.",
		);
		expect(slack).not.toContain("Complétez les");
		expect(comment.startsWith(checklist)).toBe(true);
		expect(comment.match(/Confirmez/g)).toHaveLength(1);
		expect(comment).toContain("- [ ]");
		expect(comment).not.toContain("Points résolus");
	});
	it("keeps one Meetup publication approval action and its direct link", () => {
		// Arrange
		const presenter = new AttentionPresenter("example/meetups", 42);
		const action = "Approve or reject Meetup publication.";
		presenter.setDiagnosticComment(
			100,
			`<!-- meetup-automation:event-diagnostics:v1 -->\n\n- [ ] **Meetup Link**: ${action}`,
		);
		const approval = episode("approval-pending", "meetup-publication:revision");
		approval.condition = { ...approval.condition, commentId: 200 };
		const value = { ...state(), post: undefined, episodes: [approval] };

		// Act
		const slack = presenter.render({ state: value, conditions: [approval] });
		const issue = presenter.issue(value);

		// Assert
		expect(slack.split(action)).toHaveLength(2);
		expect(issue.split(action)).toHaveLength(2);
		expect(slack).toContain("#issuecomment-200|Review details");
	});
});
