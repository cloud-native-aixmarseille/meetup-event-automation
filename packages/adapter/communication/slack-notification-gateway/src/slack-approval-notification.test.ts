import { describe, expect, it, vi } from "vitest";
import { SlackNotificationGatewayComposition } from "./dependency-composition.js";
import { SlackApprovalNotification } from "./slack-approval-notification.js";
import type { SlackFetch } from "./slack-notification-gateway-contracts.js";

function notification(fetcher: SlackFetch, token = "token") {
	const composition = new SlackNotificationGatewayComposition();
	return new SlackApprovalNotification(
		{ slackMessageReference: composition.slackMessageReference() },
		composition.slackApiClient(token, fetcher),
	);
}

describe("Slack approval notification", () => {
	it.each([
		["approved", "white_check_mark"],
		["rejected", "x"],
	] as const)(
		"reacts to the original message for %s",
		async (decision, emoji) => {
			// Arrange
			const fetcher = vi
				.fn()
				.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
			const gateway = notification(fetcher);

			// Act
			const accepted = await gateway.react(
				{ destination: "G12345", messageId: "100.001" },
				decision,
			);

			// Assert
			expect(accepted).toBe(true);
			expect(fetcher).toHaveBeenCalledWith(
				"https://slack.com/api/reactions.add",
				expect.objectContaining({
					body: JSON.stringify({
						channel: "G12345",
						timestamp: "100.001",
						name: emoji,
					}),
				}),
			);
		},
	);
	it.each([
		["already_reacted", true],
		["missing_scope", false],
		["ratelimited", false],
		["message_not_found", false],
	] as const)("handles the reaction response %s", async (error, expected) => {
		// Arrange
		const gateway = notification(
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ ok: false, error }),
			}),
		);

		// Act
		const accepted = await gateway.react(
			{ destination: "C12345", messageId: "100.001" },
			"approved",
		);

		// Assert
		expect(accepted).toBe(expected);
	});
	it("allows a later reaction retry after an uncertain transport outcome", async () => {
		// Arrange
		const gateway = notification(
			vi.fn().mockRejectedValue(new Error("private provider failure")),
		);

		// Act
		const accepted = await gateway.react(
			{ destination: "C12345", messageId: "100.001" },
			"rejected",
		);

		// Assert
		expect(accepted).toBe(false);
	});
});
