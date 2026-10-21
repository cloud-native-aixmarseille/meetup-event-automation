import type { ApprovalCommentCodec } from "./approval-comment-codec.js";
import type { ApprovalDecision, StoredApproval } from "./approval-state.js";
import type { ApprovalMessages } from "./i18n/approval-messages.js";

export interface MeetupApprovalPresenterCollaborators {
	readonly approvalCommentCodec: Pick<ApprovalCommentCodec, "marker">;
}

export class MeetupApprovalPresenter {
	constructor(
		private readonly collaborators: MeetupApprovalPresenterCollaborators,
		private readonly messages: ApprovalMessages,
	) {}
	issue(
		record: Extract<StoredApproval, { kind: "meetup-publication" }>,
		decision: ApprovalDecision,
	): string {
		const details = record.publication;
		const content = this.messages.t("approval.meetup.details", {
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
			? this.messages.t("approval.meetup.final", {
					status: record.decision.status,
					actor: record.decision.actor,
					decidedAt: record.decision.decidedAt,
				})
			: this.messages.t("approval.meetup.request", {
					approveMark: decision.status === "approved" ? "x" : " ",
					rejectMark: decision.status === "rejected" ? "x" : " ",
				});
		return [
			this.collaborators.approvalCommentCodec.marker(record),
			content,
			controls,
		].join("\n\n");
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
export type MeetupApprovalPresenterArguments =
	ConstructorParameters<typeof MeetupApprovalPresenter> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
