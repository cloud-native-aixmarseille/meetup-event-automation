import type { OrganizerApprovalResult } from "@meetup-automation/journey";
import type { ApprovalNotifications } from "./approval-notifications.js";
import type { ApprovalState } from "./approval-state.js";
import type { GithubApprovalRepository } from "./github-approval-repository.js";
import type { ResolveApprovalDecision } from "./resolve-approval-decision.js";

/** A verified choice becomes authoritative only after durable bot persistence. */
export class FinalizeApprovalDecision {
	constructor(
		private readonly decisions: ResolveApprovalDecision,
		private readonly repository: GithubApprovalRepository,
		private readonly notifications: ApprovalNotifications,
	) {}
	async execute(state: ApprovalState): Promise<OrganizerApprovalResult> {
		const { record, comment } = state;
		const decision = await this.decisions.execute(record, comment);
		if (decision.status !== "pending" && !record.decision) {
			if (!decision.actor || !decision.decidedAt)
				throw new Error("Missing verified approval identity");
			record.decision = {
				status: decision.status,
				actor: decision.actor,
				decidedAt: decision.decidedAt,
			};
		}
		await this.repository.save(record, state);
		return {
			status: decision.status,
			notificationFailed: await this.notifications.react(record, comment.id),
		};
	}
}
export type FinalizeApprovalDecisionArguments = ConstructorParameters<
	typeof FinalizeApprovalDecision
>;
