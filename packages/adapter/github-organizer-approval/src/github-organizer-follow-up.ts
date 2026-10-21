import type {
	FollowUpApprovalPolicy,
	OrganizerFollowUp,
	OrganizerFollowUpInput,
} from "@meetup-automation/journey";
import type { ApprovalRecordFactory } from "./approval-record-factory.js";
import type { FinalizeApprovalDecision } from "./finalize-approval-decision.js";
import type { GithubApprovalRepository } from "./github-approval-repository.js";

/** Maintain the shared post-event comment without replacing a human choice. */
export class GithubOrganizerFollowUp implements OrganizerFollowUp {
	constructor(
		private readonly policy: Pick<FollowUpApprovalPolicy, "retainRequest">,
		private readonly repository: GithubApprovalRepository,
		private readonly records: ApprovalRecordFactory,
		private readonly finalizer: FinalizeApprovalDecision,
	) {}
	async synchronizeFollowUp(
		input: OrganizerFollowUpInput,
	): Promise<number | undefined> {
		const existing = (await this.repository.states()).find(
			({ record }) => record.kind === "email-thanks",
		);
		if (!existing && !input.active) return undefined;
		if (existing) await this.finalizer.execute(existing);
		const attention = existing?.record.followUp?.attention;
		const attentionDetails = existing?.record.followUp?.attentionDetails;
		const record =
			existing && this.policy.retainRequest(input, existing.record.eventDate)
				? existing.record
				: this.records.placeholder(input);
		record.followUp = {
			active: input.active,
			pendingTasks: input.pendingTasks,
			attention,
			attentionDetails,
		};
		const state = await this.repository.save(record, existing);
		return state.comment.id;
	}
	async followUpAttention(): Promise<
		{ commentId: number; body?: string } | undefined
	> {
		const state = (await this.repository.states()).find(
			({ record }) => record.followUp,
		);
		return state
			? { commentId: state.comment.id, body: state.record.followUp?.attention }
			: undefined;
	}
	async saveFollowUpAttention(body: string, details?: string): Promise<void> {
		const state = (await this.repository.states()).find(
			({ record }) => record.followUp,
		);
		if (!state?.record.followUp)
			throw new Error("Missing post-event follow-up comment");
		await this.finalizer.execute(state);
		state.record.followUp = {
			...state.record.followUp,
			attention: body,
			attentionDetails: details,
		};
		await this.repository.save(state.record, state);
	}
}
export type GithubOrganizerFollowUpArguments =
	ConstructorParameters<typeof GithubOrganizerFollowUp> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
