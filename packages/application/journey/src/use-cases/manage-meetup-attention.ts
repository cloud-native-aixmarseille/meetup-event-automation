import {
	EvaluateAttention,
	PostEventPolicy,
	type AttentionApprovalSource,
	type AttentionRecoverySource,
	type AttentionStage,
	type AttentionPostRecovery,
	type CommunicationClock,
	type ReconcileAttention,
} from "@meetup-automation/communication";
import {
	type EventDocumentCodec,
	type EventIdentity,
	type EventRepository,
	ReconcileEvent,
} from "@meetup-automation/event";
import type { AutomationConfig } from "../config/automation-config.js";
import { AttentionEventFacts } from "./attention-event-facts.js";
import {
	FOLLOW_UP_TASKS,
	type OrganizerFollowUp,
} from "../ports/organizer-follow-up.js";
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
export class ManageMeetupAttention {
	constructor(
		private readonly dependencies: ManageMeetupAttentionDependencies,
	) {}
	async execute(
		identity: EventIdentity,
		stages: readonly AttentionStage[],
		runId?: string,
		recovery?: AttentionPostRecovery,
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
		const facts = AttentionEventFacts.create(codec.decode(source), config);
		const evidence = await this.evidence();
		const observation = EvaluateAttention.execute(
			{ ...facts, ...evidence, stages, runId },
			clock.now(),
		);
		const current = await repository.find(identity);
		if (!current || !ReconcileEvent.eventDocumentsEqual(source, current))
			throw new Error("Attention issue changed during evaluation");
		const commentId = await this.dependencies.followUp.synchronizeFollowUp({
			eventDate: facts.eventDate,
			requestedAt: clock.now().toISOString(),
			active: PostEventPolicy.isDue({
				eventDate: facts.eventDate,
				occurrenceStatus: facts.occurrence,
				timeZone: "Europe/Paris",
				now: clock.now(),
			}),
			pendingTasks: FOLLOW_UP_TASKS.filter((task) =>
				facts.followUpPending.includes(task),
			),
		});
		const result = await this.dependencies.reconciliation.execute(
			{ ...observation, commentId },
			recovery,
		);
		return {
			...result,
			skipped: false,
			notificationFailed:
				result.notificationFailed ||
				evidence.approvals === undefined ||
				evidence.recovery === undefined,
		};
	}
	private async evidence() {
		// Each evidence source is independent; unavailable evidence must not resolve old work.
		const [approvals, recovery] = await Promise.allSettled([
			this.dependencies.approvals.readAttention(),
			this.dependencies.recovery.readAttention(),
		]);
		return {
			approvals: approvals.status === "fulfilled" ? approvals.value : undefined,
			recovery: recovery.status === "fulfilled" ? recovery.value : undefined,
		};
	}
}
