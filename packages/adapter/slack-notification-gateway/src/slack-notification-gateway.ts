import type {
	GatewayDispatchResult,
	NotificationGateway,
	NotificationMessageIntent,
} from "@meetup-automation/communication";
import { SlackApiClient } from "./slack-api-client.js";
import type { SlackFetch } from "./slack-notification-gateway-contracts.js";

export class SlackNotificationGateway implements NotificationGateway {
	private readonly client: SlackApiClient;
	constructor(token: string, fetcher: SlackFetch = fetch) {
		this.client = new SlackApiClient(token, fetcher);
	}
	async dispatch(
		message: NotificationMessageIntent,
	): Promise<GatewayDispatchResult> {
		const response = await this.client.post("chat.postMessage", {
			channel: message.recipient.destination,
			text: message.content,
		});
		return response.result;
	}
}
