import type {
	AttentionApproval,
	AttentionApprovalSource,
} from "@meetup-automation/communication";
import type { FinalizeApprovalDecision } from "./finalize-approval-decision.js";
import type { GithubApprovalRepository } from "./github-approval-repository.js";

/** Project verified approval status for attention, excluding task placeholders. */
export class GithubApprovalAttentionSource implements AttentionApprovalSource {
	constructor(
		private readonly repository: GithubApprovalRepository,
		private readonly finalizer: FinalizeApprovalDecision,
	) {}
	async synchronizeApprovals(): Promise<readonly AttentionApproval[]> {
		const result: AttentionApproval[] = [];
		for (const state of await this.repository.states()) {
			if (state.record.recipientCount === 0) continue;
			const decision = await this.finalizer.execute(state);
			result.push({
				revision: state.record.revision,
				requestedAt: state.record.requestedAt,
				commentId: state.comment.id,
				eventDate: state.record.eventDate,
				kind: state.record.kind,
				status: decision.status,
			});
		}
		return result;
	}
}
export type GithubApprovalAttentionSourceArguments = ConstructorParameters<
	typeof GithubApprovalAttentionSource
>;
