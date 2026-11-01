import type { OrganizerApprovalResult } from "@meetup-automation/journey";
import type { ApprovalNotifications } from "./approval-notifications.js";
import type { ApprovalState } from "./approval-state.js";
import type { GithubApprovalRepository } from "./github-approval-repository.js";
import type { ResolveApprovalDecision } from "./resolve-approval-decision.js";

/** A verified choice becomes authoritative only after durable bot persistence. */
export interface FinalizeApprovalDecisionCollaborators {
	readonly approvalRequestPolicy: Pick<
		import("@meetup-automation/journey").ApprovalRequestPolicy,
		"resolved"
	>;
	readonly attentionPolicy: Pick<
		import("@meetup-automation/communication").AttentionPolicy,
		"resolved"
	>;
}
export class FinalizeApprovalDecision {
	constructor(
		private readonly collaborators: FinalizeApprovalDecisionCollaborators,
		private readonly decisions: ResolveApprovalDecision,
		private readonly repository: GithubApprovalRepository,
		private readonly notifications: ApprovalNotifications,
		private readonly visibility: {
			synchronize(
				commentId: number,
				body: string,
				resolved: boolean,
			): Promise<void>;
		},
		private readonly attentionCodec: Pick<
			import("@meetup-automation/journey").FollowUpAttentionCodec,
			"read"
		>,
	) {}
	async execute(
		state: ApprovalState,
		validateText?: (text: string) => boolean,
	): Promise<OrganizerApprovalResult> {
		const { record, comment } = state;
		const decision = await this.decisions.execute(record, comment);
		const textValid =
			decision.editedText === undefined || validateText?.(decision.editedText);
		if (
			!record.decision &&
			decision.editedText !== undefined &&
			(decision.status === "pending" || !textValid)
		)
			return {
				status: "pending",
				notificationFailed: false,
				editedText: decision.editedText,
				invalidText: textValid === false,
			};
		if (decision.status !== "pending" && !record.decision) {
			if (!decision.actor || !decision.decidedAt)
				throw new Error("Missing verified approval identity");
			record.decision = {
				status: decision.status,
				actor: decision.actor,
				decidedAt: decision.decidedAt,
				...(decision.editedText === undefined
					? {}
					: { editedText: decision.editedText }),
				...(decision.selectedImage
					? { selectedImage: decision.selectedImage }
					: {}),
			};
		}
		const persisted = await this.repository.save(record, state);
		await this.refreshVisibility(persisted);
		return {
			status: decision.status,
			...(record.kind === "content-review" ? decision : {}),
			notificationFailed: await this.notifications.react(record, comment.id),
		};
	}
	async refreshVisibility(state: ApprovalState): Promise<void> {
		const { record, comment } = state;
		const attention = record.followUp?.attention;
		const resolved = this.collaborators.approvalRequestPolicy.resolved({
			decided: record.decision !== undefined,
			recipientCount: record.recipientCount,
			followUp: record.followUp,
			attentionPending:
				attention !== undefined &&
				!this.collaborators.attentionPolicy.resolved(
					this.attentionCodec.read(attention),
				),
		});
		await this.visibility.synchronize(comment.id, comment.body ?? "", resolved);
	}
}
export type FinalizeApprovalDecisionArguments =
	ConstructorParameters<typeof FinalizeApprovalDecision> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
