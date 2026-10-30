import type { ApprovalDecision, StoredApproval } from "./approval-state.js";
import type { ContentTextPreview } from "./content-text-preview.js";
import type { ApprovalMessages } from "./i18n/approval-messages.js";

export class ContentApprovalPresenter {
	constructor(
		private readonly messages: ApprovalMessages,
		private readonly textPreview: ContentTextPreview,
	) {}
	issue(
		record: StoredApproval<"content-review">,
		decision: ApprovalDecision,
	): string {
		const content = record.content;
		return [
			this.messages.t("approval.content.title", {
				target: content.target,
			}),
			content.plannedAt
				? this.messages.t("approval.content.planned", {
						time: content.plannedAt,
					})
				: "",
			...(content.attempts ?? []).map((status, index) =>
				status === "complete"
					? ""
					: this.messages.t("approval.content.slot", {
							index: index + 1,
							status: status.replaceAll("-", "_"),
						}),
			),
			content.draft.text
				? this.textPreview.render(
						record.decision?.editedText ?? content.draft.text,
					)
				: "",
			...content.draft.media.map((media, index) =>
				[
					this.messages.t("approval.content.image-label", { index: index + 1 }),
					`![${this.escape(media.description)}](<${media.url}>)`,
				].join("\n\n"),
			),
			record.decision
				? this.messages.t("approval.content.final", {
						status: record.decision.status.replaceAll("-", "_"),
						actor: record.decision.actor,
						decidedAt: record.decision.decidedAt,
						image:
							content.draft.media.findIndex(
								(media) => media.id === record.decision?.selectedImage,
							) + 1,
					})
				: this.controls(record, decision),
		]
			.filter(Boolean)
			.join("\n\n");
	}
	private controls(
		record: StoredApproval<"content-review">,
		decision: ApprovalDecision,
	): string {
		const images =
			record.content.target === "cover" ? record.content.draft.media : [];
		const approve = images.length
			? images
					.map((image, index) =>
						this.messages.t("approval.content.image-choice", {
							mark:
								decision.status === "approved" &&
								decision.selectedImage === image.id
									? "x"
									: " ",
							index: index + 1,
						}),
					)
					.join("\n")
			: this.messages.t("approval.content.text-choice", {
					mark: decision.status === "approved" ? "x" : " ",
				});
		return this.messages.t("approval.content.request", {
			target: record.content.target,
			approve,
			rejectMark: decision.status === "rejected" ? "x" : " ",
			iterateMark: decision.status === "iteration-requested" ? "x" : " ",
		});
	}
	private escape(value: string): string {
		return value
			.replaceAll("&", "&amp;")
			.replaceAll("<", "&lt;")
			.replaceAll(">", "&gt;")
			.replaceAll("[", "&#91;")
			.replaceAll("]", "&#93;");
	}
}
