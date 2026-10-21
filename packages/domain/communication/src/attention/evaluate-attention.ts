import { PostEventPolicy } from "../post-event-policy.js";
import { AttentionPolicy } from "./attention-policy.js";
import type {
	AttentionApproval,
	AttentionCondition,
	AttentionObservation,
	AttentionOwner,
	AttentionRecoveryItem,
} from "./model.js";
export interface AttentionStage {
	readonly owner: "event" | "assets" | "feedback" | "communications";
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
export class EvaluateAttention {
	static execute(facts: AttentionFacts, now: Date): AttentionObservation {
		const stopped =
			facts.closed ||
			facts.occurrence === "cancelled" ||
			facts.occurrence === "postponed";
		const conditions: AttentionCondition[] = [];
		if (!stopped) EvaluateAttention.tasks(facts, now, conditions);
		const evaluated: AttentionOwner[] = [];
		if (!stopped) EvaluateAttention.stages(facts, evaluated, conditions);
		if (facts.approvals) evaluated.push("approvals");
		if (facts.recovery) evaluated.push("delivery");
		for (const item of (facts.recovery ?? []).filter(
			(item) => !item.resolved && (!stopped || item.uncertain !== false),
		))
			conditions.push({
				...EvaluateAttention.condition(
					"delivery-recovery",
					"delivery",
					item.key,
					"daily",
				),
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
	private static stages(
		facts: AttentionFacts,
		evaluated: AttentionOwner[],
		conditions: AttentionCondition[],
	): void {
		for (const stage of facts.stages)
			EvaluateAttention.stage(stage, evaluated, conditions);
		for (const owner of ["approvals", "delivery"] as const) {
			const available =
				owner === "approvals" ? facts.approvals : facts.recovery;
			if (!available)
				conditions.push(
					EvaluateAttention.condition("stage-unknown", owner, owner, "none"),
				);
		}
	}
	private static stage(
		stage: AttentionStage,
		evaluated: AttentionOwner[],
		conditions: AttentionCondition[],
	): void {
		if (stage.prerequisiteBlocked) return;
		if (stage.outcome !== "unknown") evaluated.push(stage.owner);
		if (stage.outcome === "success" && !stage.blocked) return;
		const unknown = stage.outcome === "unknown";
		conditions.push(
			EvaluateAttention.condition(
				unknown ? "stage-unknown" : "integration-failure",
				stage.owner,
				EvaluateAttention.stageResource(stage),
				unknown ? "none" : "daily",
			),
		);
	}
	private static stageResource(stage: AttentionStage): string {
		return stage.owner === "event" && stage.outcome === "success"
			? "event-data"
			: stage.owner;
	}
	private static tasks(
		facts: AttentionFacts,
		now: Date,
		conditions: AttentionCondition[],
	): void {
		const eventDay = AttentionPolicy.eventDay(facts.eventDate);
		const day = AttentionPolicy.day(now);
		const postEvent = PostEventPolicy.isDue({
			eventDate: facts.eventDate,
			timeZone: "Europe/Paris",
			occurrenceStatus: facts.occurrence,
			now,
		});
		if (eventDay === undefined)
			conditions.push(
				EvaluateAttention.condition("missing-date", "event", "date", "weekly"),
			);
		EvaluateAttention.preparation(facts, eventDay, day, conditions);
		if (postEvent)
			for (const task of facts.followUpPending)
				conditions.push(
					EvaluateAttention.condition("follow-up", "event", task, "follow-up"),
				);
		EvaluateAttention.approvals(facts, conditions, postEvent);
	}
	private static approvals(
		facts: AttentionFacts,
		conditions: AttentionCondition[],
		postEvent: boolean,
	): void {
		for (const approval of facts.approvals ?? []) {
			const relevant =
				approval.kind === (postEvent ? "email-thanks" : "email-introduction") ||
				(!postEvent && approval.kind === "meetup-publication");
			if (
				approval.status === "pending" &&
				approval.eventDate === facts.eventDate &&
				relevant
			)
				conditions.push({
					...EvaluateAttention.condition(
						"approval-pending",
						"approvals",
						approval.kind === "meetup-publication"
							? `${approval.kind}:${approval.revision}`
							: approval.revision,
						"approval",
					),
					since: approval.requestedAt,
					commentId: approval.commentId,
				});
		}
	}
	private static preparation(
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
					EvaluateAttention.condition(
						"host-confirmation",
						"event",
						"host",
						"preparation",
					),
				);
			if (!facts.speakersConfirmed)
				conditions.push(
					EvaluateAttention.condition(
						"speaker-confirmation",
						"event",
						"speakers",
						"preparation",
					),
				);
			if (facts.requiredDataMissing)
				conditions.push(
					EvaluateAttention.condition(
						"required-data",
						"event",
						"event",
						"preparation",
					),
				);
			for (const task of facts.publicationPending)
				conditions.push(
					EvaluateAttention.condition(
						"manual-publication",
						"event",
						task,
						"preparation",
					),
				);
		}
	}
	private static condition(
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
