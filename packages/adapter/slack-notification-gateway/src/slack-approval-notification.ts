import type {
	ApprovalNotificationMessage,
	ApprovalNotificationResult,
	OrganizerApprovalNotification,
} from "@meetup-automation/journey";
import { SlackApiClient } from "./slack-api-client.js";
import type { SlackFetch } from "./slack-notification-gateway-contracts.js";

export class SlackApprovalNotification
	implements OrganizerApprovalNotification
{
	private readonly client: SlackApiClient;
	constructor(token: string, fetcher: SlackFetch = fetch) {
		this.client = new SlackApiClient(token, fetcher);
	}
	async send(input: {
		destination: string;
		content: string;
	}): Promise<ApprovalNotificationResult> {
		const { result, payload } = await this.client.post("chat.postMessage", {
			channel: input.destination,
			text: input.content,
		});
		if (result.outcome !== "accepted") return result;
		if (
			typeof payload?.channel !== "string" ||
			!/^[CGD][A-Z0-9]+$/.test(payload.channel) ||
			typeof payload.ts !== "string" ||
			!/^\d+\.\d+$/.test(payload.ts)
		)
			return { outcome: "uncertain", diagnosticCode: "ambiguous-response" };
		return {
			outcome: "accepted",
			message: { destination: payload.channel, messageId: payload.ts },
		};
	}
	async react(
		message: ApprovalNotificationMessage,
		decision: "approved" | "rejected",
	): Promise<boolean> {
		const { result, payload } = await this.client.post("reactions.add", {
			channel: message.destination,
			timestamp: message.messageId,
			name: decision === "approved" ? "white_check_mark" : "x",
		});
		return (
			result.outcome === "accepted" || payload?.error === "already_reacted"
		);
	}
}
