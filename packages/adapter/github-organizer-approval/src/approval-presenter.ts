import type { OrganizerApprovalKind } from "@meetup-automation/journey";
import type { ApprovalCommentCodec } from "./approval-comment-codec.js";
import type { ApprovalDecision, StoredApproval } from "./approval-state.js";

/** Each kind has an explicitly composed renderer with its own accepted record. */
export type ApprovalRenderers = {
	readonly [Kind in OrganizerApprovalKind]: {
		issue(record: StoredApproval<Kind>, decision: ApprovalDecision): string;
	};
};

export class ApprovalPresenter {
	constructor(
		private readonly codec: Pick<ApprovalCommentCodec, "marker">,
		private readonly renderers: ApprovalRenderers,
	) {}
	issue<Kind extends OrganizerApprovalKind>(
		record: StoredApproval<Kind>,
		decision: ApprovalDecision,
	): string {
		return [
			this.codec.marker(record),
			this.renderers[record.kind].issue(record, decision),
		]
			.filter(Boolean)
			.join("\n\n");
	}
}
