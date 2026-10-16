import {
	type ApprovalDecision,
	ApprovalRecord,
	type StoredApproval,
} from "./approval-record.js";
import { ApprovalMessages } from "./i18n/approval-messages.js";
import { ApprovalDetailsPresenter } from "./approval-details-presenter.js";
import { FollowUpPresenter } from "./follow-up-presenter.js";

export class ApprovalPresenter {
	constructor(private readonly messages: ApprovalMessages) {}
	issue(record: StoredApproval, decision: ApprovalDecision): string {
		const heading = [
			ApprovalRecord.marker(record),
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
	decision(record: StoredApproval, body: string): ApprovalDecision {
		if (
			record.decision ||
			record.recipientCount === 0 ||
			record.followUp?.active === false
		)
			return { status: "pending" };
		const normalized = body.replace(/\r\n/g, "\n").replace(/- \[X\]/g, "- [x]");
		for (const locale of ["en", "fr"]) {
			const presenter = new ApprovalPresenter(new ApprovalMessages(locale));
			for (const status of ["approved", "rejected"] as const) {
				if (normalized === presenter.issue(record, { status }))
					return { status };
			}
		}
		return { status: "pending" };
	}
	slack(record: StoredApproval, url: string): string {
		return this.messages.t("approval.slack", {
			kind: record.kind.replace("email-", ""),
			date: record.eventDate,
			count: record.recipientCount,
			url,
		});
	}
}
