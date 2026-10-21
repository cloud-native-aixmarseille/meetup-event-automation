import {
	FOLLOW_UP_TASKS,
	type FollowUpApprovalPolicy,
} from "@meetup-automation/journey";
import type { StoredApproval } from "./approval-state.js";
import type { ApprovalMessages } from "./i18n/approval-messages.js";
export class FollowUpPresenter {
	constructor(
		private readonly policy: Pick<FollowUpApprovalPolicy, "progressState">,
		private readonly messages: ApprovalMessages,
	) {}
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
		const progress = this.policy.progressState(
			record.followUp,
			record.recipientCount ?? 0,
		);
		if (progress !== "review")
			lines.push(this.messages.t(`follow-up.${progress}`, {}));

		return lines;
	}
}
export type FollowUpPresenterArguments =
	ConstructorParameters<typeof FollowUpPresenter> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
