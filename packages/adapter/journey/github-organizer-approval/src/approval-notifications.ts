import type { OrganizerApprovalNotification } from "@meetup-automation/journey";
import type { ApprovalPresenter } from "./approval-presenter.js";
import type { StoredApproval } from "./approval-state.js";
import type { GithubApprovalClient } from "./github-approval-client.js";

/** Safely finish decision reactions on previously recorded notification messages. */
export class ApprovalNotifications {
	constructor(
		private readonly client: Pick<GithubApprovalClient, "replace">,
		private readonly presenter: Pick<ApprovalPresenter, "issue">,
		private readonly notifications: OrganizerApprovalNotification,
	) {}
	async react(record: StoredApproval, commentId: number): Promise<boolean> {
		if (!record.decision || record.reactionSent) return false;
		if (!record.notificationMessage) return record.notification === "reserved";
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
export type ApprovalNotificationsArguments = ConstructorParameters<
	typeof ApprovalNotifications
>;
