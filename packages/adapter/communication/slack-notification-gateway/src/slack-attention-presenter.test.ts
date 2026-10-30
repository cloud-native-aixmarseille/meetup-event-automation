import type { AttentionChecklist } from "@meetup-automation/communication";
import { CommunicationDomainComposition } from "@meetup-automation/communication";
import { describe, expect, it } from "vitest";
import {
	attentionEpisode as episode,
	attentionState as state,
} from "../testing/attention.fixtures.js";
import { SlackNotificationGatewayComposition } from "./dependency-composition.js";
import { SlackAttentionPresenter } from "./slack-attention-presenter.js";

function attentionFixture(
	locale = "en",
	checklist: AttentionChecklist = { entries: [] },
) {
	return new SlackAttentionPresenter(
		{
			attentionTaskSelection:
				new CommunicationDomainComposition().attentionTaskSelection(),
			attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
		},
		"example/meetups",
		42,
		new SlackNotificationGatewayComposition().slackAttentionMessages(locale),
		{
			read: () => checklist,
		},
	);
}
describe("Slack attention presentation", () => {
	it.each([
		["en", "Jun 8, 2099", "Email preparation or sending failed.", "Review run"],
		[
			"fr",
			"8 juin 2099",
			"La préparation ou l'envoi des emails a échoué.",
			"Voir l'exécution",
		],
	])(
		"renders a compact linked heading and action in %s",
		(locale, date, action, link) => {
			// Arrange
			const presenter = attentionFixture(locale);

			// Act
			const rendered = presenter.render({
				state: { ...state(), runId: "1234" },
				conditions: [episode()],
			});

			// Assert
			expect(rendered).toBe(
				`⚠️ *<https://github.com/example/meetups/issues/42|Meetup #42>* · ${date}\n\n• ${action} · <https://github.com/example/meetups/actions/runs/1234|${link}>`,
			);
		},
	);
	it.each([
		["en", "+2 more tasks → View all"],
		["fr", "+2 autres tâches → Tout voir"],
	])(
		"limits Slack to six actions with linked overflow in %s",
		(locale, overflow) => {
			// Arrange
			const presenter = attentionFixture(locale);
			const conditions = [
				episode(),
				episode("integration-failure", "assets"),
				episode("integration-failure", "feedback"),
				episode("host-confirmation"),
				episode("speaker-confirmation"),
				episode("missing-date"),
				episode("delivery-recovery"),
				episode("manual-publication", "publish-meetup-event"),
			];

			// Act
			const rendered = presenter.render({ state: state(), conditions });

			// Assert
			expect(rendered.split("•")).toHaveLength(7);
			expect(rendered).toContain(
				`<https://github.com/example/meetups/issues/42|${overflow}>`,
			);
		},
	);
	it.each(["", "2099-02-31", "<!channel>"])(
		"omits an invalid date %s",
		(eventDate) => {
			// Arrange
			const presenter = attentionFixture();

			// Act
			const rendered = presenter.render({
				state: { ...state(), eventDate },
				conditions: [episode("missing-date")],
			});

			// Assert
			expect(rendered).toBe(
				"⚠️ *<https://github.com/example/meetups/issues/42|Meetup #42>*\n\n• Set the event date.",
			);
		},
	);
	it("links pending content reviews without labeling them as emails", () => {
		// Arrange
		const presenter = attentionFixture("fr");
		const pending = episode("approval-pending", "content-review:revision");
		pending.condition = { ...pending.condition, commentId: 200 };
		// Act
		const body = presenter.render({ state: state(), conditions: [pending] });
		// Assert
		expect(body).toContain("Modifiez le texte si besoin");
		expect(body).toContain("#issuecomment-200");
		expect(body).not.toContain("courriels");
	});

	it("preserves the concrete checklist with approval links without repeated tasks", () => {
		// Arrange
		const presenter = attentionFixture("en", {
			commentId: 100,
			entries: [
				{
					field: "other",
					label: "Communication",
					description: "Approve or reject the emails.",
					action: "email-approval",
				},
				{
					field: "other",
					label: "OpenFeedback Link",
					description: "Synchronize each talk.",
				},
			],
		});
		const approval = episode("approval-pending");
		approval.condition = { ...approval.condition, commentId: 200 };

		// Act
		const rendered = presenter.render({
			state: { ...state(), commentId: 200 },
			conditions: [approval],
		});

		// Assert
		expect(rendered.split("Approve or reject the emails.")).toHaveLength(2);
		expect(rendered).toContain("• OpenFeedback Link: Synchronize each talk.");
		expect(rendered).toContain("#issuecomment-200|Meetup #42");
	});
	it("links to unverified delivery recovery while ordinary tasks are stopped", () => {
		// Arrange
		const presenter = attentionFixture();
		const recovery = episode("delivery-recovery", "private-delivery-key");
		recovery.condition = {
			...recovery.condition,
			commentId: 123,
			recovery: true,
		};
		recovery.status = "unknown";

		// Act
		const rendered = presenter.render({
			state: { ...state(), stopped: true },
			conditions: [recovery],
		});

		// Assert
		expect(rendered).toContain(
			"• Verify delivery before retrying. _(status unverified)_ · <https://github.com/example/meetups/issues/42#issuecomment-123|Review details>",
		);
		expect(rendered).not.toContain("private-delivery-key");
	});
	it("escapes task text and rejects injected links and identifiers", () => {
		// Arrange
		const presenter = attentionFixture("en", {
			entries: [
				{
					field: "other",
					label: "Communication",
					description: "Review <!channel> & details",
				},
			],
		});
		const failure = episode("integration-failure", "<!channel>");
		failure.condition = { ...failure.condition, commentId: -1 };

		// Act
		const rendered = presenter.render({
			state: { ...state(), runId: "123|run> <!channel>" },
			conditions: [failure],
		});

		// Assert
		expect(rendered).not.toContain("<!channel>");
		expect(rendered).not.toContain("actions/runs/");
		expect(rendered).not.toContain("issuecomment-");
		expect(rendered).toContain("&lt;!channel&gt; &amp; details");
	});
	it("marks concrete checklist tasks pending with no generic condition", () => {
		// Arrange
		const presenter = attentionFixture("en", {
			entries: [
				{
					field: "other",
					label: "Communication",
					description: "Add a recipient address.",
				},
			],
		});

		// Act
		const rendered = presenter.render({ state: state(), conditions: [] });

		// Assert
		expect(rendered).toContain("⚠️");
		expect(rendered).toContain("• Communication: Add a recipient address.");
		expect(rendered).not.toContain("No pending tasks.");
	});
	it("coalesces equal output for unknown resources", () => {
		// Arrange
		const presenter = attentionFixture();

		// Act
		const rendered = presenter.render({
			state: state(),
			conditions: [
				episode("integration-failure", "unknown-one"),
				episode("integration-failure", "unknown-two"),
			],
		});

		// Assert
		expect(rendered.match(/Automation failed: review the issue/g)).toHaveLength(
			1,
		);
	});
	it("renders resolved state for an existing message", () => {
		// Arrange
		const presenter = attentionFixture();

		// Act
		const rendered = presenter.render({ state: state(), conditions: [] });

		// Assert
		expect(rendered).toBe(
			"✅ *<https://github.com/example/meetups/issues/42|Meetup #42>* · Jun 8, 2099\n\nNo pending tasks.",
		);
	});
});
