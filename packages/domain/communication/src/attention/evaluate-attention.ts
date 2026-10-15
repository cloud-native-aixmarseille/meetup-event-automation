import type {
	AttentionApproval,
	AttentionCondition,
	AttentionObservation,
	AttentionOwner,
	AttentionRecoveryItem,
} from "./model.js";
import { AttentionPolicy } from "./attention-policy.js";
export interface AttentionStage {
	readonly owner: "event" | "assets" | "feedback" | "communications";
	readonly outcome: "success" | "failure" | "unknown";
	readonly blocked: boolean;
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
		for (const stage of facts.stages) {
			if (stage.outcome !== "unknown") evaluated.push(stage.owner);
			if (stage.outcome === "success" && !stage.blocked) continue;
			const unknown = stage.outcome === "unknown";
			conditions.push(
				EvaluateAttention.condition(
					unknown ? "stage-unknown" : "integration-failure",
					stage.owner,
					stage.owner,
					unknown ? "none" : "daily",
				),
			);
		}
		for (const owner of ["approvals", "delivery"] as const) {
			const available =
				owner === "approvals" ? facts.approvals : facts.recovery;
			if (!available)
				conditions.push(
					EvaluateAttention.condition("stage-unknown", owner, owner, "none"),
				);
		}
	}
	private static tasks(
		facts: AttentionFacts,
		now: Date,
		conditions: AttentionCondition[],
	): void {
		const eventDay = AttentionPolicy.eventDay(facts.eventDate);
		const day = AttentionPolicy.day(now);
		if (eventDay === undefined)
			conditions.push(
				EvaluateAttention.condition("missing-date", "event", "date", "weekly"),
			);
		EvaluateAttention.preparation(facts, eventDay, day, conditions);
		if (facts.occurrence === "held")
			for (const task of facts.followUpPending)
				conditions.push(
					EvaluateAttention.condition("follow-up", "event", task, "follow-up"),
				);
		EvaluateAttention.approvals(facts, conditions);
	}
	private static approvals(
		facts: AttentionFacts,
		conditions: AttentionCondition[],
	): void {
		for (const approval of facts.approvals ?? []) {
			const relevant =
				approval.kind ===
				(facts.occurrence === "held" ? "email-thanks" : "email-introduction");
			if (
				approval.status === "pending" &&
				approval.eventDate === facts.eventDate &&
				relevant
			)
				conditions.push({
					...EvaluateAttention.condition(
						"approval-pending",
						"approvals",
						approval.revision,
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
		if (facts.occurrence === "scheduled") {
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
			if (eventDay !== undefined && day > eventDay)
				conditions.push(
					EvaluateAttention.condition(
						"occurrence-decision",
						"event",
						"occurrence",
						"occurrence",
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
