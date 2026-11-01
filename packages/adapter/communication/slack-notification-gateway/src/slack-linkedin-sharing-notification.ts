import type {
	LinkedInPostReference,
	LinkedInSharingNotification,
} from "@meetup-automation/communication";
import type { SlackAttentionMessages } from "./attention-i18n/slack-attention-messages.js";
import type { SlackApiClient } from "./slack-api-client.js";
import type { SlackMessageReference } from "./slack-message-reference.js";

export class SlackLinkedInSharingNotification
	implements LinkedInSharingNotification
{
	constructor(
		private readonly client: Pick<SlackApiClient, "post">,
		private readonly channel: string,
		private readonly messages: Pick<SlackAttentionMessages, "t">,
		private readonly references: Pick<LinkedInPostReference, "read">,
		private readonly messageReferences: Pick<SlackMessageReference, "read">,
	) {
		if (!/^[CG][A-Z0-9]+$/.test(channel))
			throw new Error("Invalid organizer channel");
	}
	async send(url: string): ReturnType<LinkedInSharingNotification["send"]> {
		const post = this.references.read(url);
		if (!post)
			return {
				result: { outcome: "rejected", diagnosticCode: "invalid-request" },
			};
		const response = await this.client.post("chat.postMessage", {
			channel: this.channel,
			text: `${this.messages.t("slack.linkedin-share")}\n${post.url}`,
			parse: "none",
			link_names: false,
			mrkdwn: true,
			unfurl_links: false,
			unfurl_media: false,
		});
		if (
			response.result.outcome === "accepted" &&
			!this.messageReferences.read(response.payload, this.channel)
		)
			return {
				result: { outcome: "uncertain", diagnosticCode: "ambiguous-response" },
			};
		return {
			result: response.result,
			retryAfterSeconds: response.retryAfterSeconds,
		};
	}
}
