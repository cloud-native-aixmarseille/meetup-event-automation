import type { ApprovalValueFingerprint } from "../approval/approval-value-fingerprint.js";
import type {
	ContentDraft,
	ContentPlan,
	ContentProposal,
} from "./promotional-content.js";
import type { PromotionalContentPolicy } from "./promotional-content-policy.js";

/** Sorted object keys, ordered arrays, explicit nulls; timestamps never enter source equality. */
export class PromotionalContentFingerprint {
	constructor(
		private readonly values: Pick<ApprovalValueFingerprint, "digest">,
		private readonly definitions: Pick<PromotionalContentPolicy, "source">,
	) {}
	digest(value: unknown): string {
		return this.values.digest(value);
	}
	source(plan: Omit<ContentPlan, "sourceFingerprint">): string {
		return this.digest({
			version: 1,
			target: plan.target,
			language: plan.language,
			plannedAt: plan.plannedAt,
			facts: this.definitions.source(plan),
		});
	}
	proposal(
		proposal: Pick<
			ContentProposal,
			| "id"
			| "plan"
			| "origin"
			| "guidance"
			| "promptVersion"
			| "recoveryRequest"
		>,
		draft: ContentDraft,
	): string {
		return this.digest({
			id: proposal.id,
			recoveryRequest: proposal.recoveryRequest,
			source: proposal.plan.sourceFingerprint,
			origin: proposal.origin,
			guidance: proposal.guidance,
			prompt: proposal.promptVersion,
			language: proposal.plan.language,
			target: proposal.plan.target,
			draft,
		});
	}
}
