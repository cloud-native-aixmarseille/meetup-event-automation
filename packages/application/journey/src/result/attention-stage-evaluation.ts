import type { AttentionStage } from "@meetup-automation/communication";
import {
	ATTENTION_STAGE_OWNERS,
	type AttentionStageReports,
} from "./attention-stage-reports.js";
import type { DiagnosticPolicy } from "./diagnostic-policy.js";
import type { OrganizerDiagnosticPolicy } from "./organizer-diagnostic-policy.js";
import type { PublicDiagnostic } from "./result-envelope.js";
/** Classifies stage evidence; a failed or absent evaluation cannot resolve work. */
export interface AttentionStageEvaluationCollaborators {
	readonly diagnosticPolicy: Pick<
		DiagnosticPolicy,
		"isTechnicalFailure" | "classify"
	>;
	readonly organizerDiagnosticPolicy: Pick<
		OrganizerDiagnosticPolicy,
		"derivative"
	>;
}

export class AttentionStageEvaluation {
	constructor(
		private readonly collaborators: AttentionStageEvaluationCollaborators,
	) {}

	evaluate(input: AttentionStageReports): readonly AttentionStage[] {
		const eventDiagnostics = input.event.diagnostics;
		return ATTENTION_STAGE_OWNERS.map((owner) => {
			const { outcome, diagnostics } = input[owner];
			const blocked = diagnostics.some(
				(item) =>
					this.collaborators.diagnosticPolicy.isTechnicalFailure(item) &&
					!this.eventPrerequisite(item.code, owner, eventDiagnostics),
			);
			const prerequisiteBlocked =
				outcome !== "unknown" &&
				!blocked &&
				diagnostics.some(
					(item) =>
						this.organizerPrerequisite(item) ||
						this.eventPrerequisite(item.code, owner, eventDiagnostics),
				);
			return {
				owner,
				outcome,
				blocked,
				...(prerequisiteBlocked ? { prerequisiteBlocked: true } : {}),
			};
		});
	}
	diagnostics(input: AttentionStageReports): readonly PublicDiagnostic[] {
		const diagnostics = new Map<string, PublicDiagnostic>();
		for (const owner of ATTENTION_STAGE_OWNERS)
			for (const item of input[owner].diagnostics)
				diagnostics.set(
					`${item.code}:${item.field ?? ""}:${item.severity}`,
					item,
				);
		const merged = [...diagnostics.values()];
		return merged.filter(
			(item) =>
				!["action.execution.failed", "event.concurrently-modified"].includes(
					item.code,
				) &&
				!this.collaborators.organizerDiagnosticPolicy.derivative(item, merged),
		);
	}
	complete(input: AttentionStageReports): boolean {
		return ATTENTION_STAGE_OWNERS.every((owner) => {
			const stage = input[owner];
			return (
				stage.outcome === "success" &&
				stage.reported &&
				!stage.diagnostics.some(
					(item) =>
						this.collaborators.diagnosticPolicy.isTechnicalFailure(item) ||
						item.code === "event.concurrently-modified",
				)
			);
		});
	}
	private organizerPrerequisite(item: PublicDiagnostic): boolean {
		if (item.code === "event.concurrently-modified") return true;
		return (
			this.collaborators.diagnosticPolicy.classify(item) === "organizer" &&
			![
				"communication.approval-pending",
				"communication.approval-rejected",
			].includes(item.code)
		);
	}

	private eventPrerequisite(
		code: string,
		owner: string,
		eventDiagnostics: readonly PublicDiagnostic[],
	): boolean {
		if (owner === "event") return false;
		return eventDiagnostics.some((item) => {
			if (
				this.collaborators.diagnosticPolicy.classify(item) ===
					"informational" ||
				!/^(event|referential)\./.test(item.code)
			)
				return false;
			return (
				item.code === code ||
				code === "communication.event-references-unresolved" ||
				(code === "communication.referential-catalog-invalid" &&
					item.code.startsWith("referential."))
			);
		});
	}
}
