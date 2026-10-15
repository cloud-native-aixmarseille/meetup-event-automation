import { createHash } from "node:crypto";
import type {
	AttentionContent,
	AttentionMessageReference,
	AttentionNotification,
	AttentionPostResult,
	AttentionView,
} from "@meetup-automation/communication";
import { SlackApiClient } from "./slack-api-client.js";
import type { SlackFetch } from "./slack-notification-gateway-contracts.js";
export class SlackAttentionNotification implements AttentionNotification {
	private readonly client: SlackApiClient;
	constructor(
		token: string,
		private readonly channel: string,
		private readonly presenter: AttentionContent,
		fetcher: SlackFetch = fetch,
	) {
		if (!/^[CG][A-Z0-9]+$/.test(channel))
			throw new Error("Invalid organizer channel");
		this.client = new SlackApiClient(token, fetcher);
	}
	fingerprint(view: AttentionView): string {
		return createHash("sha256")
			.update(this.presenter.render(view))
			.digest("hex");
	}
	async post(view: AttentionView): Promise<AttentionPostResult> {
		const response = await this.client.post(
			"chat.postMessage",
			this.body(this.channel, view),
		);
		const { result, payload } = response;
		if (result.outcome === "uncertain") return { outcome: "uncertain" };
		if (result.outcome !== "accepted")
			return {
				outcome: "retry",
				retryAfterSeconds: response.retryAfterSeconds,
			};
		if (
			payload?.channel !== this.channel ||
			typeof payload.ts !== "string" ||
			!/^\d+\.\d+$/.test(payload.ts)
		)
			return { outcome: "uncertain" };
		return {
			outcome: "accepted",
			message: { destination: this.channel, messageId: payload.ts },
		};
	}
	async update(
		message: AttentionMessageReference,
		view: AttentionView,
	): Promise<boolean> {
		const { result } = await this.client.post("chat.update", {
			...this.body(message.destination, view),
			ts: message.messageId,
		});
		return result.outcome === "accepted";
	}
	private body(channel: string, view: AttentionView) {
		return {
			channel,
			text: this.presenter.render(view),
			parse: "none",
			link_names: false,
			mrkdwn: true,
			unfurl_links: false,
			unfurl_media: false,
		};
	}
}
