import type { ApprovalDecision, StoredApproval } from "./approval-state.js";
import type { ApprovalMessages } from "./i18n/approval-messages.js";

export class MeetupSlidesApprovalPresenter {
	constructor(private readonly messages: ApprovalMessages) {}
	issue(
		record: StoredApproval<"meetup-slides">,
		decision: ApprovalDecision,
	): string {
		const details = this.messages.t("approval.slides.details", {
			date: record.eventDate,
			...record.slides,
		});
		const controls = record.decision
			? this.messages.t("approval.slides.final", record.decision)
			: this.messages.t("approval.slides.request", {
					approveMark: decision.status === "approved" ? "x" : " ",
					rejectMark: decision.status === "rejected" ? "x" : " ",
				});
		return [details, controls].join("\n\n");
	}
}
