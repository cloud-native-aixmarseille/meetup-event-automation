import { ApprovalCommentCodec } from "./approval-comment-codec.js";
import { ApprovalDetailsPresenter } from "./approval-details-presenter.js";
import type { ApprovalDecision, StoredApproval } from "./approval-state.js";
import { FollowUpPresenter } from "./follow-up-presenter.js";
import type { ApprovalMessages } from "./i18n/approval-messages.js";

export class EmailApprovalPresenter {
	constructor(private readonly messages: ApprovalMessages) {}
	issue(
		record: Exclude<StoredApproval, { kind: "meetup-publication" }>,
		decision: ApprovalDecision,
	): string {
		const heading = [
			ApprovalCommentCodec.marker(record),
			...new FollowUpPresenter(this.messages).render(record),
		];
		if (record.recipientCount === 0 || record.followUp?.active === false)
			return [...heading, record.followUp?.attentionDetails ?? ""]
				.join("\n\n")
				.trimEnd();
		const details = record.details
			? [new ApprovalDetailsPresenter(this.messages).render(record.details)]
			: [];
		if (record.followUp?.attentionDetails)
			details.push(record.followUp.attentionDetails);
		if (record.decision)
			return [
				...heading,
				this.messages.t("approval.final", {
					kind: record.kind.replace("email-", ""),
					date: record.eventDate,
					count: record.recipientCount,
					status: record.decision.status,
					actor: record.decision.actor,
					decidedAt: record.decision.decidedAt,
				}),
				...details,
			].join("\n\n");
		return [
			...heading,
			this.messages.t("approval.request", {
				kind: record.kind.replace("email-", ""),
				date: record.eventDate,
				count: record.recipientCount,
				approveMark: decision.status === "approved" ? "x" : " ",
				rejectMark: decision.status === "rejected" ? "x" : " ",
			}),
			...details,
		].join("\n\n");
	}
}
