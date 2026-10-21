import { describe, expect, it, vi } from "vitest";
import { SlackApprovalPresenter } from "./slack-approval-presenter.js";
import { SlackApprovalNotification } from "./slack-approval-notification.js";

describe("Slack approval notification", () => {
	it("retains the acknowledged channel and message timestamp", async () => {
		// Arrange
		const fetcher = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				ok: true,
				channel: "C12345",
				ts: "100.001",
				private: "provider-data",
			}),
		});
		const gateway = new SlackApprovalNotification(
			"private-token",
			new SlackApprovalPresenter("en"),
			fetcher,
		);
		// Act
		const result = await gateway.send({
			destination: "C12345",
			kind: "meetup-publication",
			eventDate: "2099-06-08",
			approvalUrl:
				"https://github.com/example/meetups/issues/42#issuecomment-100",
		});
		// Assert
		expect(result).toEqual({
			outcome: "accepted",
			message: { destination: "C12345", messageId: "100.001" },
		});
		expect(JSON.stringify(result)).not.toContain("private");
		expect(fetcher).toHaveBeenCalledWith(
			"https://slack.com/api/chat.postMessage",
			expect.objectContaining({
				body: JSON.stringify({
					channel: "C12345",
					text: "Meetup publication · 2099-06-08\nReview the draft and approve or reject publication: https://github.com/example/meetups/issues/42#issuecomment-100",
				}),
			}),
		);
	});
	it.each([
		{ ok: true },
		{ ok: true, channel: "C12345", ts: 100.001 },
		{ ok: true, channel: "invalid-channel", ts: "100.001" },
	])(
		"does not acknowledge a post without a usable reference: %j",
		async (payload) => {
			// Arrange
			const gateway = new SlackApprovalNotification(
				"token",
				new SlackApprovalPresenter("en"),
				vi.fn().mockResolvedValue({ ok: true, json: async () => payload }),
			);
			// Act
			const result = await gateway.send({
				destination: "C12345",
				kind: "meetup-publication",
				eventDate: "2099-06-08",
				approvalUrl:
					"https://github.com/example/meetups/issues/42#issuecomment-100",
			});
			// Assert
			expect(result).toEqual({
				outcome: "uncertain",
				diagnosticCode: "ambiguous-response",
			});
		},
	);
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
			const gateway = new SlackApprovalNotification(
				"token",
				new SlackApprovalPresenter("en"),
				fetcher,
			);
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
		const gateway = new SlackApprovalNotification(
			"token",
			new SlackApprovalPresenter("en"),
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
		const gateway = new SlackApprovalNotification(
			"token",
			new SlackApprovalPresenter("en"),
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
