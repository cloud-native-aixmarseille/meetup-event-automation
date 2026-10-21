import { createHash } from "node:crypto";
import type {
	AttentionMessageReference,
	AttentionNotification,
	AttentionPostResult,
	AttentionView,
} from "@meetup-automation/communication";
import type {
	SlackApiClient,
	SlackApiClientArguments,
} from "./slack-api-client.js";
import type { SlackAttentionPresenter } from "./slack-attention-presenter.js";
import type { SlackMessageReference } from "./slack-message-reference.js";
import type { SlackFetch } from "./slack-notification-gateway-contracts.js";
export interface SlackAttentionNotificationCollaborators {
	readonly slackMessageReference: Pick<SlackMessageReference, "read" | "valid">;
	readonly createSlackApiClient: (
		...args: SlackApiClientArguments
	) => SlackApiClient;
}

export class SlackAttentionNotification implements AttentionNotification {
	private readonly client: SlackApiClient;
	constructor(
		private readonly collaborators: SlackAttentionNotificationCollaborators,
		token: string,
		private readonly channel: string,
		private readonly presenter: Pick<SlackAttentionPresenter, "render">,
		fetcher: SlackFetch = fetch,
	) {
		if (!/^[CG][A-Z0-9]+$/.test(channel))
			throw new Error("Invalid organizer channel");
		this.client = this.collaborators.createSlackApiClient(token, fetcher);
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
		const message = this.collaborators.slackMessageReference.read(
			payload,
			this.channel,
		);
		return message
			? { outcome: "accepted", message }
			: { outcome: "uncertain" };
	}
	async update(
		message: AttentionMessageReference,
		view: AttentionView,
	): Promise<boolean> {
		if (!this.collaborators.slackMessageReference.valid(message)) return false;
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
export type SlackAttentionNotificationArguments =
	ConstructorParameters<typeof SlackAttentionNotification> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
