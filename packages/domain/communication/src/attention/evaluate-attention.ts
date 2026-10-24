import type { PostEventPolicy } from "../post-event-policy.js";
import type { AttentionPolicy } from "./attention-policy.js";
import type {
	AttentionApproval,
	AttentionCondition,
	AttentionObservation,
	AttentionOwner,
	AttentionRecoveryItem,
} from "./model.js";
export interface AttentionStage {
	readonly owner:
		| "event"
		| "assets"
		| "feedback"
		| "communications"
		| "content";
	readonly outcome: "success" | "failure" | "unknown";
	readonly blocked: boolean;
	/** A reported event problem prevented evaluating this integration. */
	readonly prerequisiteBlocked?: boolean;
}
export interface AttentionFacts {
	readonly eventDate: string;
	readonly closed: boolean;
	readonly occurrence: "scheduled" | "held" | "cancelled" | "postponed";
	readonly requiredDataMissing: boolean;
	readonly hostConfirmed: boolean;
	readonly speakersConfirmed: boolean;
	readonly publicationPending: readonly string[];
	readonly followUpPending: readonly string[];
	readonly stages: readonly AttentionStage[];
	readonly approvals?: readonly AttentionApproval[];
	readonly recovery?: readonly AttentionRecoveryItem[];
	readonly runId?: string;
}
export interface EvaluateAttentionCollaborators {
	readonly attentionPolicy: Pick<AttentionPolicy, "eventDay" | "day">;
	readonly postEventPolicy: Pick<PostEventPolicy, "isDue">;
}

export class EvaluateAttention {
	constructor(private readonly collaborators: EvaluateAttentionCollaborators) {}

	execute(facts: AttentionFacts, now: Date): AttentionObservation {
		const stopped =
			facts.closed ||
			facts.occurrence === "cancelled" ||
			facts.occurrence === "postponed";
		const conditions: AttentionCondition[] = [];
		if (!stopped) this.tasks(facts, now, conditions);
		const evaluated: AttentionOwner[] = [];
		if (!stopped) this.stages(facts, evaluated, conditions);
		if (facts.approvals) evaluated.push("approvals");
		if (facts.recovery) evaluated.push("delivery");
		for (const item of (facts.recovery ?? []).filter(
			(item) => !item.resolved && (!stopped || item.uncertain !== false),
		))
			conditions.push({
				...this.condition("delivery-recovery", "delivery", item.key, "daily"),
				recovery: item.uncertain === false ? undefined : true,
				commentId: item.commentId,
			});
		return {
			conditions,
			evaluated,
			verifiedRecovery: (facts.recovery ?? [])
				.filter((item) => item.uncertain === false)
				.map((item) => `delivery-recovery:${item.key}`),
			stopped,
			eventDate: facts.eventDate,
			runId: facts.runId,
		};
	}
	private stages(
		facts: AttentionFacts,
		evaluated: AttentionOwner[],
		conditions: AttentionCondition[],
	): void {
		for (const stage of facts.stages) this.stage(stage, evaluated, conditions);
		for (const owner of ["approvals", "delivery"] as const) {
			const available =
				owner === "approvals" ? facts.approvals : facts.recovery;
			if (!available)
				conditions.push(this.condition("stage-unknown", owner, owner, "none"));
		}
	}
	private stage(
		stage: AttentionStage,
		evaluated: AttentionOwner[],
		conditions: AttentionCondition[],
	): void {
		if (stage.prerequisiteBlocked) return;
		if (stage.outcome !== "unknown") evaluated.push(stage.owner);
		if (stage.outcome === "success" && !stage.blocked) return;
		const unknown = stage.outcome === "unknown";
		conditions.push(
			this.condition(
				unknown ? "stage-unknown" : "integration-failure",
				stage.owner,
				this.stageResource(stage),
				unknown ? "none" : "daily",
			),
		);
	}
	private stageResource(stage: AttentionStage): string {
		return stage.owner === "event" && stage.outcome === "success"
			? "event-data"
			: stage.owner;
	}
	private tasks(
		facts: AttentionFacts,
		now: Date,
		conditions: AttentionCondition[],
	): void {
		const eventDay = this.collaborators.attentionPolicy.eventDay(
			facts.eventDate,
		);
		const day = this.collaborators.attentionPolicy.day(now);
		const postEvent = this.collaborators.postEventPolicy.isDue({
			eventDate: facts.eventDate,
			timeZone: "Europe/Paris",
			occurrenceStatus: facts.occurrence,
			now,
		});
		if (eventDay === undefined)
			conditions.push(
				this.condition("missing-date", "event", "date", "weekly"),
			);
		this.preparation(facts, eventDay, day, conditions);
		if (postEvent)
			for (const task of facts.followUpPending)
				conditions.push(
					this.condition("follow-up", "event", task, "follow-up"),
				);
		this.approvals(facts, conditions, postEvent);
	}
	private approvals(
		facts: AttentionFacts,
		conditions: AttentionCondition[],
		postEvent: boolean,
	): void {
		for (const approval of facts.approvals ?? []) {
			const relevant =
				approval.kind === (postEvent ? "email-thanks" : "email-introduction") ||
				(!postEvent &&
					(approval.kind === "meetup-publication" ||
						approval.kind === "community-publication" ||
						approval.kind === "content-review"));
			if (
				approval.status === "pending" &&
				approval.eventDate === facts.eventDate &&
				relevant
			)
				conditions.push({
					...this.condition(
						"approval-pending",
						"approvals",
						approval.kind === "meetup-publication" ||
							approval.kind === "community-publication" ||
							approval.kind === "content-review"
							? `${approval.kind}:${approval.revision}`
							: approval.revision,
						"approval",
					),
					since: approval.requestedAt,
					commentId: approval.commentId,
				});
		}
	}
	private preparation(
		facts: AttentionFacts,
		eventDay: number | undefined,
		day: number,
		conditions: AttentionCondition[],
	): void {
		if (
			facts.occurrence === "scheduled" &&
			(eventDay === undefined || day <= eventDay)
		) {
			if (!facts.hostConfirmed)
				conditions.push(
					this.condition("host-confirmation", "event", "host", "preparation"),
				);
			if (!facts.speakersConfirmed)
				conditions.push(
					this.condition(
						"speaker-confirmation",
						"event",
						"speakers",
						"preparation",
					),
				);
			if (facts.requiredDataMissing)
				conditions.push(
					this.condition("required-data", "event", "event", "preparation"),
				);
			for (const task of facts.publicationPending)
				conditions.push(
					this.condition("manual-publication", "event", task, "preparation"),
				);
		}
	}
	private condition(
		code: AttentionCondition["code"],
		owner: AttentionOwner,
		resource: string,
		policy: AttentionCondition["policy"],
	): AttentionCondition {
		return {
			key: `${code}:${resource}`,
			code,
			owner,
			resource,
			policy,
			severity: ["integration-failure", "delivery-recovery"].includes(code)
				? "error"
				: "warning",
		};
	}
}
