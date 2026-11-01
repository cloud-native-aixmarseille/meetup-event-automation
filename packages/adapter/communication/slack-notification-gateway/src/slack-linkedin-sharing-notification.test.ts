import { LinkedInPostReference } from "@meetup-automation/communication";
import { describe, expect, it, vi } from "vitest";
import { SlackNotificationGatewayComposition } from "./dependency-composition.js";
import { SlackLinkedInSharingNotification } from "./slack-linkedin-sharing-notification.js";
import { SlackMessageReference } from "./slack-message-reference.js";

describe("LinkedIn sharing on the organizer Slack channel", () => {
	it.each([
		["fr", "Le post LinkedIn est en ligne. Merci de le partager :"],
		["en", "The LinkedIn post is live. Please share it:"],
	])("sends a concise sharing request in %s", async (locale, text) => {
		// Arrange
		const post = vi.fn().mockResolvedValue({
			result: { outcome: "accepted" },
			payload: { ok: true, channel: "CORGANIZERS", ts: "1793520000.000001" },
		});
		const notification = new SlackLinkedInSharingNotification(
			{ post },
			"CORGANIZERS",
			new SlackNotificationGatewayComposition().slackAttentionMessages(locale),
			new LinkedInPostReference(),
			new SlackMessageReference(),
		);
		const url = "https://www.linkedin.com/feed/update/urn:li:activity:12345/";
		// Act
		const result = await notification.send(url);
		// Assert
		expect(result.result.outcome).toBe("accepted");
		expect(post).toHaveBeenCalledExactlyOnceWith("chat.postMessage", {
			channel: "CORGANIZERS",
			text: `${text}\n${url}`,
			parse: "none",
			link_names: false,
			mrkdwn: true,
			unfurl_links: false,
			unfurl_media: false,
		});
	});
	it("does not accept a receipt for a different channel", async () => {
		// Arrange
		const post = vi.fn().mockResolvedValue({
			result: { outcome: "accepted" },
			payload: { ok: true, channel: "COTHER", ts: "1793520000.000001" },
		});
		const notification = new SlackLinkedInSharingNotification(
			{ post },
			"CORGANIZERS",
			new SlackNotificationGatewayComposition().slackAttentionMessages("en"),
			new LinkedInPostReference(),
			new SlackMessageReference(),
		);
		// Act
		const result = await notification.send(
			"https://www.linkedin.com/feed/update/urn:li:activity:12345/",
		);
		// Assert
		expect(result.result.outcome).toBe("uncertain");
	});
});
