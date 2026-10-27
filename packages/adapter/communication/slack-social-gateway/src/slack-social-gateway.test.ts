import type { SocialPostInput } from "@meetup-automation/communication";
import { describe, expect, it, vi } from "vitest";
import {
	SlackSocialClient,
	type SlackSocialFetch,
} from "./slack-social-client.js";
import { SlackSocialGateway } from "./slack-social-gateway.js";

function input(): SocialPostInput {
	return {
		destination: {
			provider: "slack",
			key: "community",
			label: "Community",
			workspaceId: "T123",
			channelId: "C456",
		},
		text: "Meetup :rocket: https://example.test/register",
	};
}
function json(payload: unknown): Response {
	return new Response(JSON.stringify(payload));
}

describe("Slack social gateway", () => {
	it("verifies the installation and publishes exact reviewed text with parsing disabled", async () => {
		// Arrange
		const fetcher = vi
			.fn<SlackSocialFetch>()
			.mockResolvedValueOnce(
				json({ ok: true, team_id: "T123", bot_id: "B789" }),
			)
			.mockResolvedValueOnce(
				json({
					ok: true,
					channel: "C456",
					ts: "100.001",
					private: "provider-secret",
				}),
			);
		const gateway = new SlackSocialGateway(
			"T123",
			new SlackSocialClient("private-token", fetcher),
		);
		const beforeWrite = vi.fn().mockResolvedValue(undefined);

		// Act
		const result = await gateway.publish(input(), beforeWrite);

		// Assert
		expect(result).toEqual({
			status: "accepted",
			receipt: {
				provider: "slack",
				workspaceId: "T123",
				channelId: "C456",
				ts: "100.001",
			},
		});
		expect(beforeWrite).toHaveBeenCalledOnce();
		expect(fetcher.mock.calls[0][0]).toBe("https://slack.com/api/auth.test");
		expect(fetcher.mock.calls[1]).toEqual([
			"https://slack.com/api/chat.postMessage",
			expect.objectContaining({
				body: JSON.stringify({
					channel: "C456",
					text: input().text,
					mrkdwn: false,
					parse: "none",
					link_names: false,
					unfurl_links: false,
					unfurl_media: false,
				}),
				redirect: "error",
			}),
		]);
		expect(beforeWrite.mock.invocationCallOrder[0]).toBeLessThan(
			fetcher.mock.invocationCallOrder[1],
		);
		expect(JSON.stringify(result)).not.toContain("private");
	});
	it("rejects routing a destination through another workspace installation", async () => {
		// Arrange
		const fetcher = vi.fn<SlackSocialFetch>();
		const gateway = new SlackSocialGateway(
			"T999",
			new SlackSocialClient("private-token", fetcher),
		);

		// Act
		const result = await gateway.publish(input(), vi.fn());

		// Assert
		expect(result).toEqual({ status: "rejected", code: "workspace-mismatch" });
		expect(fetcher).not.toHaveBeenCalled();
	});
	it.each([
		{ ok: true, team_id: "T999", bot_id: "B789" },
		{ ok: true, team_id: "T123" },
	])(
		"rejects an installation whose workspace or bot identity is unverified",
		async (payload) => {
			// Arrange
			const fetcher = vi
				.fn<SlackSocialFetch>()
				.mockResolvedValue(json(payload));
			const gateway = new SlackSocialGateway(
				"T123",
				new SlackSocialClient("private-token", fetcher),
			);

			// Act
			const result = await gateway.publish(input(), vi.fn());

			// Assert
			expect(result).toEqual({
				status: "rejected",
				code: "workspace-mismatch",
			});
			expect(fetcher).toHaveBeenCalledOnce();
		},
	);
	it.each([
		"<!channel>",
		"<!here>",
		"<!everyone>",
		"<@U123>",
		"",
		"x".repeat(4001),
	])("rejects unsafe or oversized text before provider calls", async (text) => {
		// Arrange
		const fetcher = vi.fn<SlackSocialFetch>();
		const gateway = new SlackSocialGateway(
			"T123",
			new SlackSocialClient("private-token", fetcher),
		);

		// Act
		const result = await gateway.publish({ ...input(), text }, vi.fn());

		// Assert
		expect(result).toEqual({ status: "rejected", code: "invalid-request" });
		expect(fetcher).not.toHaveBeenCalled();
	});
	it("stops when final authorization changes after credential validation", async () => {
		// Arrange
		const fetcher = vi
			.fn<SlackSocialFetch>()
			.mockResolvedValue(json({ ok: true, team_id: "T123", bot_id: "B789" }));
		const gateway = new SlackSocialGateway(
			"T123",
			new SlackSocialClient("private-token", fetcher),
		);
		const beforeWrite = vi
			.fn()
			.mockRejectedValue(new Error("approval-changed"));

		// Act
		const pending = gateway.publish(input(), beforeWrite);

		// Assert
		await expect(pending).rejects.toThrow("approval-changed");
		expect(fetcher).toHaveBeenCalledOnce();
	});
	it.each([
		{ ok: true },
		{ ok: true, channel: "C999", ts: "100.001" },
		{ ok: true, channel: "C456", ts: 100.001 },
	])(
		"retains uncertainty for missing or mismatched acknowledged identity",
		async (payload) => {
			// Arrange
			const fetcher = vi
				.fn<SlackSocialFetch>()
				.mockResolvedValueOnce(
					json({ ok: true, team_id: "T123", bot_id: "B789" }),
				)
				.mockResolvedValueOnce(json(payload));
			const gateway = new SlackSocialGateway(
				"T123",
				new SlackSocialClient("private-token", fetcher),
			);

			// Act
			const result = await gateway.publish(input(), vi.fn());

			// Assert
			expect(result).toEqual({
				status: "uncertain",
				code: "ambiguous-response",
			});
			expect(fetcher).toHaveBeenCalledTimes(2);
		},
	);
	it("can defer a read-only credential check failure without marking publication uncertain", async () => {
		// Arrange
		const fetcher = vi
			.fn<SlackSocialFetch>()
			.mockRejectedValue(new Error("private-provider-details"));
		const gateway = new SlackSocialGateway(
			"T123",
			new SlackSocialClient("private-token", fetcher),
		);

		// Act
		const result = await gateway.publish(input(), vi.fn());

		// Assert
		expect(result).toEqual({
			status: "deferred",
			code: "provider-unavailable",
		});
		expect(fetcher).toHaveBeenCalledOnce();
	});
	it("retains uncertainty after a public request loses its response", async () => {
		// Arrange
		const fetcher = vi
			.fn<SlackSocialFetch>()
			.mockResolvedValueOnce(
				json({ ok: true, team_id: "T123", bot_id: "B789" }),
			)
			.mockRejectedValueOnce(new Error("private-provider-details"));
		const gateway = new SlackSocialGateway(
			"T123",
			new SlackSocialClient("private-token", fetcher),
		);

		// Act
		const result = await gateway.publish(input(), vi.fn());

		// Assert
		expect(result).toEqual({
			status: "uncertain",
			code: "unknown-provider-state",
		});
		expect(fetcher).toHaveBeenCalledTimes(2);
	});
});
