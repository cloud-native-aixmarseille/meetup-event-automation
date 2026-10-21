import { createHash } from "node:crypto";
import type {
	AttentionMessageReference,
	AttentionNotification,
	AttentionPostResult,
	AttentionView,
} from "@meetup-automation/communication";
import { SlackApiClient } from "./slack-api-client.js";
import type { SlackAttentionPresenter } from "./slack-attention-presenter.js";
import { SlackMessageReference } from "./slack-message-reference.js";
import type { SlackFetch } from "./slack-notification-gateway-contracts.js";
export class SlackAttentionNotification implements AttentionNotification {
	private readonly client: SlackApiClient;
	constructor(
		token: string,
		private readonly channel: string,
		private readonly presenter: Pick<SlackAttentionPresenter, "render">,
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
		const message = SlackMessageReference.read(payload, this.channel);
		return message
			? { outcome: "accepted", message }
			: { outcome: "uncertain" };
	}
	async update(
		message: AttentionMessageReference,
		view: AttentionView,
	): Promise<boolean> {
		if (!SlackMessageReference.valid(message)) return false;
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
