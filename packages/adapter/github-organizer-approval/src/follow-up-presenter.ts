import { FOLLOW_UP_TASKS } from "@meetup-automation/journey";
import type { StoredApproval } from "./approval-state.js";
import type { ApprovalMessages } from "./i18n/approval-messages.js";
export class FollowUpPresenter {
	constructor(private readonly messages: ApprovalMessages) {}
	render(record: StoredApproval): string[] {
		if (!record.followUp) return [];
		const lines = [
			this.messages.t("follow-up.title", { date: record.eventDate }),
			this.messages.t("follow-up.instructions", {}),
		];
		for (const task of FOLLOW_UP_TASKS) {
			const pending = record.followUp.pendingTasks.includes(task);
			lines.push(
				`${pending ? "⏳" : "✅"} ${this.messages.t("follow-up.task", { task: task.replaceAll("-", "_") })}`,
			);
		}
		if (!record.followUp.active)
			lines.push(this.messages.t("follow-up.stopped", {}));
		else if (!record.recipientCount)
			lines.push(
				this.messages.t(
					record.followUp.pendingTasks.some((task) => task.startsWith("thank-"))
						? "follow-up.waiting"
						: "follow-up.emails-complete",
					{},
				),
			);
		return lines;
	}
}
