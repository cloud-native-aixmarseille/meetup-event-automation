import type {
	ApprovalNotificationMessage,
	OrganizerApprovalNotification,
} from "@meetup-automation/journey";
import type { SlackApiClient } from "./slack-api-client.js";
import type { SlackMessageReference } from "./slack-message-reference.js";

export interface SlackApprovalNotificationCollaborators {
	readonly slackMessageReference: Pick<SlackMessageReference, "read" | "valid">;
}

export class SlackApprovalNotification
	implements OrganizerApprovalNotification
{
	constructor(
		private readonly collaborators: SlackApprovalNotificationCollaborators,
		private readonly client: Pick<SlackApiClient, "post">,
	) {}
	async react(
		message: ApprovalNotificationMessage,
		decision: "approved" | "rejected" | "iteration-requested",
	): Promise<boolean> {
		if (!this.collaborators.slackMessageReference.valid(message)) return false;
		const { result, payload } = await this.client.post("reactions.add", {
			channel: message.destination,
			timestamp: message.messageId,
			name:
				decision === "approved"
					? "white_check_mark"
					: decision === "iteration-requested"
						? "arrows_counterclockwise"
						: "x",
		});
		return (
			result.outcome === "accepted" || payload?.error === "already_reacted"
		);
	}
}
