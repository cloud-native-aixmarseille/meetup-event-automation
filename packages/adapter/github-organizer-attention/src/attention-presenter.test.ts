import { describe, expect, it } from "vitest";
import { episode, state } from "../testing/attention.fixtures.js";
import { AttentionPresenter } from "./attention-presenter.js";
import { AttentionMessages } from "./i18n/attention-messages.js";

describe("localized attention projection", () => {
	it.each([
		["en", "Jun 8, 2099", "Failed or blocked: communications.", "Review run"],
		[
			"fr",
			"8 juin 2099",
			"Échec ou blocage : communications.",
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
		["en", "+5 more tasks → View all"],
		["fr", "+5 autres tâches → Tout voir"],
	])(
		"bounds Slack to three actions with a linked overflow count in %s",
		(locale, overflow) => {
			// Arrange
			const presenter = new AttentionPresenter(
				"example/meetups",
				42,
				new AttentionMessages(locale),
			);
			const conditions = Array.from({ length: 8 }, (_, index) =>
				episode("integration-failure", `task-${index}`),
			);
			const value = { ...state(), episodes: conditions };

			// Act
			const rendered = presenter.render({ state: value, conditions });
			const issue = presenter.issue(value);

			// Assert
			expect(rendered.split("•")).toHaveLength(4);
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
			"✅ *<https://github.com/example/meetups/issues/42|Meetup #42>* · Jun 8, 2099\n\nNo outstanding organizer tasks.",
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
		expect(rendered).toContain("Failed or blocked: review the issue.");
	});
	it("shows detailed recovery on GitHub while Slack acknowledgement remains pending", () => {
		// Arrange
		const presenter = new AttentionPresenter("example/meetups", 42);
		const value = { ...state(), stopped: true };

		// Act
		const rendered = presenter.issue(value);

		// Assert
		expect(rendered).toContain("automatic reposting is blocked");
		expect(rendered).toContain("Task reminders stopped");
	});
});
