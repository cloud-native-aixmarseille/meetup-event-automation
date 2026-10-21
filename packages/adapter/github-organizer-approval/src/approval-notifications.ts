import type { OrganizerApprovalNotification } from "@meetup-automation/journey";
import type { ApprovalPresenter } from "./approval-presenter.js";
import type { StoredApproval } from "./approval-record.js";
import type { GithubApprovalClient } from "./github-approval-client.js";

/** Reserve new posts, retain their destination, and safely retry decision reactions. */
export class ApprovalNotifications {
	constructor(
		private readonly client: GithubApprovalClient,
		private readonly presenter: ApprovalPresenter,
		private readonly notifications: OrganizerApprovalNotification,
		private readonly channelId: string,
	) {}
	async send(record: StoredApproval, commentId: number): Promise<boolean> {
		if (record.kind === "email-thanks") return false;
		if (record.notification !== "new" && record.notification !== "retry")
			return record.notification === "reserved";
		const before = this.presenter.issue(record, { status: "pending" });
		record.notification = "reserved";
		const reserved = this.presenter.issue(record, { status: "pending" });
		await this.client.replace(commentId, before, reserved);
		try {
			const result = await this.notifications.send({
				destination: this.channelId,
				eventDate: record.eventDate,
				approvalUrl: this.client.url(commentId),
				...(record.kind === "meetup-publication"
					? { kind: record.kind }
					: { kind: record.kind, recipientCount: record.recipientCount }),
			});
			record.notification =
				result.outcome === "accepted"
					? "sent"
					: result.outcome === "uncertain"
						? "reserved"
						: "retry";
			if (result.outcome === "accepted" && result.message)
				record.notificationMessage = result.message;
		} catch {
			/* Never duplicate a post after an ambiguous acknowledgement. */
		}
		await this.client.replace(
			commentId,
			reserved,
			this.presenter.issue(record, { status: "pending" }),
		);
		return record.notification !== "sent";
	}
	async react(record: StoredApproval, commentId: number): Promise<boolean> {
		if (record.kind === "email-thanks") return false;
		if (!record.decision || record.reactionSent) return false;
		if (!record.notificationMessage) return record.notification !== "sent";
		const before = this.presenter.issue(record, record.decision);
		try {
			const accepted = await this.notifications.react(
				record.notificationMessage,
				record.decision.status,
			);
			if (!accepted) return true;
			record.reactionSent = true;
			await this.client.replace(
				commentId,
				before,
				this.presenter.issue(record, record.decision),
			);
			return false;
		} catch {
			// The same bot/reaction/message tuple is idempotent even after uncertain writes.
			return true;
		}
	}
}
