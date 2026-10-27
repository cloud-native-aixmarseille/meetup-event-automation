import type { ApprovalDecision, StoredApproval } from "./approval-state.js";
import type { ApprovalMessages } from "./i18n/approval-messages.js";

export class SocialPublicationApprovalPresenter {
	constructor(private readonly messages: Pick<ApprovalMessages, "t">) {}

	issue(
		record: StoredApproval<"social-publication">,
		decision: ApprovalDecision,
	): string {
		const details = record.social;
		return [
			this.messages.t("approval.social.details", {
				target: this.escape(details.target),
				destination: this.escape(details.destinationLabel),
				identity: this.escape(details.destinationIdentity),
				plannedAt:
					details.plannedAt === "after-approval"
						? this.messages.t("approval.social.after-approval", {})
						: details.plannedAt,
				expiresAt: details.expiresAt,
			}),
			`<pre>${this.escape(details.text)}</pre>`,
			...details.media.map((media) =>
				[
					`![${this.escape(media.description)}](<${media.url}>)`,
					`${this.escape(media.id)} · ${media.width}×${media.height} · ${media.mimeType} · ${media.fingerprint}`,
				].join("\n\n"),
			),
			details.recovery
				? this.messages.t("approval.social.evidence", {
						outcome: details.recovery.outcome.replaceAll("-", "_"),
						reference: this.escape(details.recovery.reference),
					})
				: "",
			this.controls(record, decision),
		]
			.filter(Boolean)
			.join("\n\n");
	}

	private controls(
		record: StoredApproval<"social-publication">,
		decision: ApprovalDecision,
	): string {
		if (record.decision)
			return this.messages.t("approval.social.final", {
				status: record.decision.status,
				actor: record.decision.actor,
				decidedAt: record.decision.decidedAt,
			});
		const marks = {
			approveMark: decision.status === "approved" ? "x" : " ",
			rejectMark: decision.status === "rejected" ? "x" : " ",
		};
		return record.social.recovery
			? this.messages.t("approval.social.recovery", {
					...marks,
					outcome: record.social.recovery.outcome.replaceAll("-", "_"),
				})
			: this.messages.t("approval.social.request", marks);
	}

	private escape(value: string): string {
		return value
			.replaceAll("&", "&amp;")
			.replaceAll("<", "&lt;")
			.replaceAll(">", "&gt;")
			.replaceAll("[", "&#91;")
			.replaceAll("]", "&#93;")
			.replaceAll("@", "&#64;");
	}
}
