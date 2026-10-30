import type { ApprovalRequestPolicy } from "@meetup-automation/journey";
import type { ApprovalPresenter } from "./approval-presenter.js";
import type { ApprovalDecision, StoredApproval } from "./approval-state.js";
import type { ContentTextPreview } from "./content-text-preview.js";

/** Keep metadata and controls exact; allow edits only inside the text preview. */
export class ApprovalDecisionParser {
	constructor(
		private readonly textPreview: ContentTextPreview,
		private readonly policy: Pick<ApprovalRequestPolicy, "reviewPhase">,
		private readonly comments: readonly Pick<ApprovalPresenter, "issue">[],
	) {}
	parse(record: StoredApproval, body: string): ApprovalDecision {
		if (
			this.policy.reviewPhase({
				recipientCount: record.recipientCount,
				followUpActive: record.followUp?.active,
				decided: record.decision !== undefined,
			}) !== "pending"
		)
			return { status: "pending" };

		const normalized = body.replace(/\r\n/g, "\n").replace(/- \[X\]/g, "- [x]");
		if (record.kind === "content-review")
			return this.content(record, normalized);
		for (const comment of this.comments) {
			for (const status of ["approved", "rejected"] as const) {
				if (normalized === comment.issue(record, { status })) return { status };
			}
		}
		return { status: "pending" };
	}
	private content(
		record: StoredApproval<"content-review">,
		body: string,
	): ApprovalDecision {
		if (record.content.target !== "cover") return this.text(record, body);
		const approvals: ApprovalDecision[] = record.content.draft.media.map(
			(media) => ({
				status: "approved",
				selectedImage: media.id,
			}),
		);
		for (const decision of [
			...approvals,
			{ status: "rejected" } as const,
			{ status: "iteration-requested" } as const,
		])
			if (
				this.comments.some(
					(comment) => comment.issue(record, decision) === body,
				)
			)
				return decision;
		return { status: "pending" };
	}
	private text(
		record: StoredApproval<"content-review">,
		body: string,
	): ApprovalDecision {
		const edited = this.textPreview.read(body);
		if (!edited) return { status: "pending" };
		const original = this.textPreview.replace(body, record.content.draft.text);
		for (const status of [
			"approved",
			"pending",
			"rejected",
			"iteration-requested",
		] as const) {
			if (
				!this.comments.some(
					(comment) => comment.issue(record, { status }) === original,
				)
			)
				continue;
			if (
				(status === "approved" || status === "pending") &&
				edited.text !== record.content.draft.text
			)
				return { status, editedText: edited.text };
			return { status };
		}
		return { status: "pending" };
	}
}
export type ApprovalDecisionParserArguments =
	ConstructorParameters<typeof ApprovalDecisionParser> extends [
		unknown,
		unknown,
		...infer Args,
	]
		? Args
		: never;
