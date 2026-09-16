import type { NotificationMessageIntent } from "@meetup-automation/communication";
import { describe, expect, it, vi } from "vitest";
import { SlackNotificationGateway } from "./slack-notification-gateway.js";

const intent = {
	channel: "notification",
	intentId: "intent-1",
	idempotencyKey: "meetup-v1-key",
	repositoryId: "repository-1",
	eventId: "event-1",
	policyVersion: "1",
	kind: "readiness-reminder",
	recipientId: "organizers",
	recipient: {
		channel: "notification",
		role: "organizers",
		recipientId: "organizers",
		receivesCommunications: true,
		destination: "channel-1",
	},
	content: "Event requires attention",
} satisfies NotificationMessageIntent;

describe("SlackNotificationGateway", () => {
	it("posts only the documented channel and text fields", async () => {
		// Arrange
		const fetcher = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ ok: true }),
		});
		const gateway = new SlackNotificationGateway("token", fetcher);

		// Act
		const actual = await gateway.dispatch(intent);

		// Assert
		expect(actual).toEqual({
			outcome: "accepted",
		});
		expect(fetcher).toHaveBeenCalledWith(
			"https://slack.com/api/chat.postMessage",
			expect.objectContaining({
				body: JSON.stringify({
					channel: "channel-1",
					text: "Event requires attention",
				}),
			}),
		);
	});

	it("does not attempt delivery without a configured token", async () => {
		// Arrange
		const fetcher = vi.fn();

		// Act
		const actual = await new SlackNotificationGateway("", fetcher).dispatch(
			intent,
		);

		// Assert
		expect(actual).toEqual({
			outcome: "rejected",
			diagnosticCode: "authentication-failed",
		});
		expect(fetcher).not.toHaveBeenCalled();
	});

	it.each([
		["invalid_auth", "authentication-failed"],
		["channel_not_found", "destination-unavailable"],
		["missing_scope", "permission-denied"],
		["invalid_arguments", "invalid-request"],
	] as const)(
		"classifies Slack %s as a definitive rejection",
		async (error, code) => {
			// Arrange
			const fetcher = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ ok: false, error }),
			});

			// Act
			const actual = await new SlackNotificationGateway(
				"token",
				fetcher,
			).dispatch(intent);

			// Assert
			expect(actual).toEqual({ outcome: "rejected", diagnosticCode: code });
		},
	);

	it("treats a transport failure as an uncertain delivery", async () => {
		// Arrange
		const transportFailure = vi
			.fn()
			.mockRejectedValue(new Error("socket reset"));

		// Act
		const result = await new SlackNotificationGateway(
			"token",
			transportFailure,
		).dispatch(intent);

		// Assert
		expect(result).toEqual({
			outcome: "uncertain",
			diagnosticCode: "unknown-provider-state",
		});
	});

	it("treats an unknown provider response as an uncertain delivery", async () => {
		// Arrange
		const unknownResponse = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ ok: false, error: "future_error" }),
		});

		// Act
		const result = await new SlackNotificationGateway(
			"token",
			unknownResponse,
		).dispatch(intent);

		// Assert
		expect(result).toEqual({
			outcome: "uncertain",
			diagnosticCode: "ambiguous-response",
		});
	});

	it("classifies Slack rate limiting as safely retryable", async () => {
		// Arrange
		const fetcher = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ ok: false, error: "ratelimited" }),
		});

		// Act
		const actual = await new SlackNotificationGateway(
			"token",
			fetcher,
		).dispatch(intent);

		// Assert
		expect(actual).toEqual({
			outcome: "deferred",
			diagnosticCode: "rate-limited",
		});
	});
});

const failureIntent = {
	channel: "notification",
	intentId: "failureIntent-safe",
	idempotencyKey: "meetup-safe-key",
	repositoryId: "repository-safe",
	eventId: "event-safe",
	policyVersion: "1",
	kind: "readiness-reminder",
	recipientId: "organizers",
	recipient: {
		channel: "notification",
		role: "organizers",
		recipientId: "organizers",
		receivesCommunications: true,
		destination: "channel-safe",
	},
	content: "A meetup event requires attention.",
} satisfies NotificationMessageIntent;

describe("Slack notification failure contract", () => {
	it.each([
		[400, "rejected", "invalid-request"],
		[422, "rejected", "invalid-request"],
		[401, "rejected", "authentication-failed"],
		[403, "rejected", "permission-denied"],
		[404, "rejected", "destination-unavailable"],
		[429, "deferred", "rate-limited"],
		[500, "uncertain", "ambiguous-response"],
	] as const)(
		"maps HTTP %s without exposing the provider body",
		async (status, outcome, diagnosticCode) => {
			// Arrange
			const fetcher = vi.fn().mockResolvedValue({ ok: false, status });

			// Act
			const result = await new SlackNotificationGateway(
				"synthetic-token",
				fetcher,
			).dispatch(failureIntent);

			// Assert
			expect(result).toEqual({ outcome, diagnosticCode });
		},
	);

	it("treats invalid success JSON as ambiguous", async () => {
		// Arrange
		const invalidJson = vi.fn().mockResolvedValue({
			ok: true,
			json: vi.fn().mockRejectedValue(new SyntaxError("invalid JSON")),
		});

		// Act
		const result = await new SlackNotificationGateway(
			"synthetic-token",
			invalidJson,
		).dispatch(failureIntent);

		// Assert
		expect(result).toEqual({
			outcome: "uncertain",
			diagnosticCode: "ambiguous-response",
		});
	});

	it("treats a malformed error field as ambiguous", async () => {
		// Arrange
		const invalidError = vi.fn().mockResolvedValue({
			ok: true,
			json: vi.fn().mockResolvedValue({ ok: false, error: { private: true } }),
		});

		// Act
		const result = await new SlackNotificationGateway(
			"synthetic-token",
			invalidError,
		).dispatch(failureIntent);

		// Assert
		expect(result).toEqual({
			outcome: "uncertain",
			diagnosticCode: "ambiguous-response",
		});
	});
});
