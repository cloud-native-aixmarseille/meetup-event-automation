import type {
	ApprovalNotificationMessage,
	ApprovalNotificationRequest,
	ApprovalNotificationResult,
	OrganizerApprovalNotification,
} from "@meetup-automation/journey";
import type { SlackApiClient } from "./slack-api-client.js";
import type { SlackApprovalPresenter } from "./slack-approval-presenter.js";
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
		private readonly presenter: Pick<SlackApprovalPresenter, "render">,
	) {}
	async send(
		input: ApprovalNotificationRequest,
	): Promise<ApprovalNotificationResult> {
		const { result, payload } = await this.client.post("chat.postMessage", {
			channel: input.destination,
			text: this.presenter.render(input),
		});
		if (result.outcome !== "accepted") return result;
		const message = this.collaborators.slackMessageReference.read(
			payload,
			input.destination,
		);
		return message
			? { outcome: "accepted", message }
			: { outcome: "uncertain", diagnosticCode: "ambiguous-response" };
	}
	async react(
		message: ApprovalNotificationMessage,
		decision: "approved" | "rejected",
	): Promise<boolean> {
		if (!this.collaborators.slackMessageReference.valid(message)) return false;
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
