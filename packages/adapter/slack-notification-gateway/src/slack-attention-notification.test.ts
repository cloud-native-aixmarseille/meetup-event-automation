import type { AttentionView } from "@meetup-automation/communication";
import { describe, expect, it, vi } from "vitest";
import { SlackNotificationGatewayComposition } from "./dependency-composition.js";
import { SlackAttentionNotification } from "./slack-attention-notification.js";

const view: AttentionView = {
	state: { eventDate: "", stopped: false, episodes: [] },
	conditions: [],
};
describe("Slack attention transport", () => {
	it("uses explicit routing and updates the accepted reference without a fresh mention", async () => {
		// Arrange
		const fetcher = vi
			.fn()
			.mockImplementation(
				async () =>
					new Response(
						JSON.stringify({ ok: true, channel: "C123", ts: "123.456" }),
					),
			);
		const notification = new SlackAttentionNotification(
			{
				slackMessageReference:
					new SlackNotificationGatewayComposition().slackMessageReference(),
				createSlackApiClient: (...args) =>
					new SlackNotificationGatewayComposition().slackApiClient(...args),
			},
			"private-token",
			"C123",
			{
				render: () =>
					"*Meetup*\n• <https://github.com/example/meetups/issues/42|Review issue>",
			},
			fetcher,
		);

		// Act
		const posted = await notification.post(view);
		const updated = await notification.update(
			{ destination: "C123", messageId: "123.456" },
			view,
		);
		const calls = fetcher.mock.calls.map(([url, input]) => ({
			url,
			body: JSON.parse(input.body),
		}));

		// Assert
		expect(posted).toEqual({
			outcome: "accepted",
			message: { destination: "C123", messageId: "123.456" },
		});
		expect(updated).toBe(true);
		for (const call of calls)
			expect(call.body).toMatchObject({
				text: "*Meetup*\n• <https://github.com/example/meetups/issues/42|Review issue>",
				mrkdwn: true,
				parse: "none",
				link_names: false,
				unfurl_links: false,
				unfurl_media: false,
			});
		expect(calls[1]).toMatchObject({
			url: "https://slack.com/api/chat.update",
			body: {
				channel: "C123",
				ts: "123.456",
				parse: "none",
				link_names: false,
				mrkdwn: true,
				unfurl_links: false,
				unfurl_media: false,
			},
		});
	});
	it.each([
		{ ok: true },
		{ ok: true, channel: "C999", ts: "123.456" },
		{ ok: false, error: "fatal_error" },
	])("holds ambiguous acknowledgement %j", async (payload) => {
		// Arrange
		const fetcher = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify(payload)));
		const notification = new SlackAttentionNotification(
			{
				slackMessageReference:
					new SlackNotificationGatewayComposition().slackMessageReference(),
				createSlackApiClient: (...args) =>
					new SlackNotificationGatewayComposition().slackApiClient(...args),
			},
			"token",
			"C123",
			{ render: () => "Status" },
			fetcher,
		);

		// Act
		const result = await notification.post(view);

		// Assert
		expect(result).toEqual({ outcome: "uncertain" });
	});
	it("honors rate-limit backoff without exposing the provider response", async () => {
		// Arrange
		const fetcher = vi.fn().mockResolvedValue(
			new Response("private provider body", {
				status: 429,
				headers: { "retry-after": "600" },
			}),
		);
		const notification = new SlackAttentionNotification(
			{
				slackMessageReference:
					new SlackNotificationGatewayComposition().slackMessageReference(),
				createSlackApiClient: (...args) =>
					new SlackNotificationGatewayComposition().slackApiClient(...args),
			},
			"token",
			"C123",
			{ render: () => "Status" },
			fetcher,
		);

		// Act
		const result = await notification.post(view);

		// Assert
		expect(result).toEqual({ outcome: "retry", retryAfterSeconds: 600 });
	});
	it("classifies a connection failure as uncertain", async () => {
		// Arrange
		const fetcher = vi
			.fn()
			.mockRejectedValue(new Error("private provider error"));
		const notification = new SlackAttentionNotification(
			{
				slackMessageReference:
					new SlackNotificationGatewayComposition().slackMessageReference(),
				createSlackApiClient: (...args) =>
					new SlackNotificationGatewayComposition().slackApiClient(...args),
			},
			"token",
			"C123",
			{ render: () => "Status" },
			fetcher,
		);

		// Act
		const result = await notification.post(view);

		// Assert
		expect(result).toEqual({ outcome: "uncertain" });
	});
});
