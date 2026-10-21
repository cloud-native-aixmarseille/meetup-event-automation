import type {
	AttentionApprovalSource,
	AttentionRecoverySource,
	AttentionStage,
	CommunicationClock,
	EvaluateAttention,
	PostEventPolicy,
	ReconcileAttention,
} from "@meetup-automation/communication";
import {
	EventConcurrentModificationError,
	type EventDocumentCodec,
	type EventDocumentConcurrency,
	type EventIdentity,
	type EventRepository,
} from "@meetup-automation/event";
import type { AutomationConfig } from "../config/automation-config.js";
import {
	FOLLOW_UP_TASKS,
	type OrganizerFollowUp,
} from "../ports/organizer-follow-up.js";
import type { AttentionEventFacts } from "./attention-event-facts.js";
export interface ManageMeetupAttentionDependencies {
	readonly config: AutomationConfig;
	readonly repository: EventRepository;
	readonly codec: EventDocumentCodec;
	readonly approvals: AttentionApprovalSource;
	readonly followUp: OrganizerFollowUp;
	readonly recovery: AttentionRecoverySource;
	readonly reconciliation: Pick<ReconcileAttention, "execute">;
	readonly clock: CommunicationClock;
}
export interface ManageMeetupAttentionCollaborators {
	readonly attentionEventFacts: Pick<AttentionEventFacts, "create">;
	readonly evaluateAttention: Pick<EvaluateAttention, "execute">;
	readonly eventDocumentConcurrency: Pick<
		EventDocumentConcurrency,
		"eventDocumentsEqual"
	>;
	readonly postEventPolicy: Pick<PostEventPolicy, "isDue">;
}

export class ManageMeetupAttention {
	constructor(
		private readonly collaborators: ManageMeetupAttentionCollaborators,
		private readonly dependencies: ManageMeetupAttentionDependencies,
	) {}
	async execute(
		identity: EventIdentity,
		stages: readonly AttentionStage[],
		runId?: string,
	) {
		const { repository, codec, config, clock } = this.dependencies;
		const source = await repository.find(identity);
		if (!source) throw new Error("Attention issue is unavailable");
		if (!source.labels.includes(config.event["issue-label"]))
			return {
				skipped: true,
				active: 0,
				posted: false,
				notificationFailed: false,
			};
		const facts = this.collaborators.attentionEventFacts.create(
			codec.decode(source),
			config,
		);
		const evidence = await this.synchronizeEvidence();
		const now = clock.now();
		const observation = this.collaborators.evaluateAttention.execute(
			{ ...facts, ...evidence, stages, runId },
			now,
		);
		const current = await repository.find(identity);
		if (
			!current ||
			!this.collaborators.eventDocumentConcurrency.eventDocumentsEqual(
				source,
				current,
			)
		)
			throw new EventConcurrentModificationError(identity);
		const commentId = await this.dependencies.followUp.synchronizeFollowUp({
			eventDate: facts.eventDate,
			requestedAt: now.toISOString(),
			active: this.collaborators.postEventPolicy.isDue({
				eventDate: facts.eventDate,
				occurrenceStatus: facts.occurrence,
				timeZone: "Europe/Paris",
				now: now,
			}),
			pendingTasks: FOLLOW_UP_TASKS.filter((task) =>
				facts.followUpPending.includes(task),
			),
		});
		const result = await this.dependencies.reconciliation.execute({
			...observation,
			commentId,
		});
		return {
			...result,
			skipped: false,
			notificationFailed:
				result.notificationFailed ||
				evidence.approvals === undefined ||
				evidence.recovery === undefined,
		};
	}
	private async synchronizeEvidence() {
		// Each evidence source is independent; unavailable evidence must not resolve old work.
		const [approvals, recovery] = await Promise.allSettled([
			this.dependencies.approvals.synchronizeApprovals(),
			this.dependencies.recovery.readAttention(),
		]);
		return {
			approvals: approvals.status === "fulfilled" ? approvals.value : undefined,
			recovery: recovery.status === "fulfilled" ? recovery.value : undefined,
		};
	}
}
export type ManageMeetupAttentionArguments =
	ConstructorParameters<typeof ManageMeetupAttention> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
