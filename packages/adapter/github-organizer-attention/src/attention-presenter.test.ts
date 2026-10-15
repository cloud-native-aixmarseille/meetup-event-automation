import { describe, expect, it } from "vitest";
import { state } from "../testing/attention.fixtures.js";
import { AttentionPresenter } from "./attention-presenter.js";
import { AttentionMessages } from "./i18n/attention-messages.js";
import type { AttentionEpisode } from "@meetup-automation/communication";
describe("localized attention projection", () => {
	it.each(["en", "fr"])(
		"bounds Slack and links full GitHub status in %s",
		(locale) => {
			// Arrange
			const presenter = new AttentionPresenter(
				"example/meetups",
				42,
				new AttentionMessages(locale),
			);
			const value = state();
			const conditions: AttentionEpisode[] = Array.from(
				{ length: 8 },
				(_, index) => ({
					condition: {
						key: `integration-failure:task-${index}`,
						code: "integration-failure",
						resource: "assets",
						owner: "assets",
						severity: "error",
						policy: "daily",
					},
					episode: 1,
					openedAt: "2099-06-01T10:00:00Z",
					status: "active",
				}),
			);
			// Act
			const rendered = presenter.render({ state: value, conditions });
			// Assert
			expect(rendered.split("•")).toHaveLength(6);
			expect(rendered).toContain(
				"https://github.com/example/meetups/issues/42",
			);
			expect(rendered).not.toContain("<!channel>");
			expect(rendered).not.toContain("attention:");
			expect(rendered).toContain(
				locale === "fr" ? "organisateurs" : "Organizer",
			);
		},
	);
	it("shows recovery on GitHub while Slack acknowledgement remains pending", () => {
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
