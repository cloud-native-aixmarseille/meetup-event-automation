import type { ApprovalDecision, StoredApproval } from "./approval-state.js";
import type { ApprovalMessages } from "./i18n/approval-messages.js";

export class CommunityApprovalPresenter {
	constructor(private readonly messages: ApprovalMessages) {}
	issue(
		record: Extract<StoredApproval, { kind: "community-publication" }>,
		decision: ApprovalDecision,
	): string {
		const details = record.publication;
		const content = this.messages.t("approval.community.details", {
			title: this.escape(details.title),
			date: record.eventDate,
			startTime: details.startTime,
			endTime: details.endTime,
			timeZone: this.escape(details.timeZone),
			venue: this.escape(details.venue.name),
			city: this.escape(details.venue.city),
			url: details.url,
		});
		const controls = record.decision
			? this.messages.t("approval.community.final", {
					status: record.decision.status,
					actor: record.decision.actor,
					decidedAt: record.decision.decidedAt,
				})
			: this.messages.t("approval.community.request", {
					approveMark: decision.status === "approved" ? "x" : " ",
					rejectMark: decision.status === "rejected" ? "x" : " ",
				});
		return [content, controls].join("\n\n");
	}
	private escape(value: string): string {
		return value
			.replaceAll("&", "&amp;")
			.replaceAll("<", "&lt;")
			.replaceAll(">", "&gt;")
			.replaceAll("@", "&#64;")
			.replace(/[\\`*_{}[\]()#+.!|~-]/g, "\\$&");
	}
}
