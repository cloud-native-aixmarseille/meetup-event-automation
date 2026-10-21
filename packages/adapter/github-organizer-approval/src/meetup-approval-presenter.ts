import type { ApprovalDecision, StoredApproval } from "./approval-record.js";
import { ApprovalRecord } from "./approval-record.js";
import type { ApprovalMessages } from "./i18n/approval-messages.js";

export class MeetupApprovalPresenter {
	constructor(private readonly messages: ApprovalMessages) {}
	issue(
		record: Extract<StoredApproval, { kind: "meetup-publication" }>,
		decision: ApprovalDecision,
	): string {
		const details = record.publication;
		const content = this.messages.t("approval.meetup.details", {
			title: MeetupApprovalPresenter.escape(details.title),
			date: record.eventDate,
			startTime: details.startTime,
			endTime: details.endTime,
			timeZone: MeetupApprovalPresenter.escape(details.timeZone),
			venue: MeetupApprovalPresenter.escape(details.venue.name),
			city: MeetupApprovalPresenter.escape(details.venue.city),
			url: details.url,
		});
		const controls = record.decision
			? this.messages.t("approval.meetup.final", {
					status: record.decision.status,
					actor: record.decision.actor,
					decidedAt: record.decision.decidedAt,
				})
			: this.messages.t("approval.meetup.request", {
					approveMark: decision.status === "approved" ? "x" : " ",
					rejectMark: decision.status === "rejected" ? "x" : " ",
				});
		return [ApprovalRecord.marker(record), content, controls].join("\n\n");
	}
	private static escape(value: string): string {
		return value
			.replaceAll("&", "&amp;")
			.replaceAll("<", "&lt;")
			.replaceAll(">", "&gt;")
			.replaceAll("@", "&#64;")
			.replace(/[\\`*_{}[\]()#+.!|~-]/g, "\\$&");
	}
}
