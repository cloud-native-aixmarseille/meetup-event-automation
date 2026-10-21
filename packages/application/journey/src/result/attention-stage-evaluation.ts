import type { AttentionStage } from "@meetup-automation/communication";
import {
	ATTENTION_STAGE_OWNERS,
	type AttentionStageReports,
} from "./attention-stage-reports.js";
import { DiagnosticPolicy } from "./diagnostic-policy.js";
import { OrganizerDiagnosticPolicy } from "./organizer-diagnostic-policy.js";
import type { PublicDiagnostic } from "./result-envelope.js";
/** Classifies stage evidence; a failed or absent evaluation cannot resolve work. */
export class AttentionStageEvaluation {
	static evaluate(input: AttentionStageReports): readonly AttentionStage[] {
		const eventDiagnostics = input.event.diagnostics;
		return ATTENTION_STAGE_OWNERS.map((owner) => {
			const { outcome, diagnostics } = input[owner];
			const blocked = diagnostics.some(
				(item) =>
					DiagnosticPolicy.isTechnicalFailure(item) &&
					!AttentionStageEvaluation.eventPrerequisite(
						item.code,
						owner,
						eventDiagnostics,
					),
			);
			const prerequisiteBlocked =
				outcome !== "unknown" &&
				!blocked &&
				diagnostics.some(
					(item) =>
						AttentionStageEvaluation.organizerPrerequisite(item) ||
						AttentionStageEvaluation.eventPrerequisite(
							item.code,
							owner,
							eventDiagnostics,
						),
				);
			return {
				owner,
				outcome,
				blocked,
				...(prerequisiteBlocked ? { prerequisiteBlocked: true } : {}),
			};
		});
	}
	static diagnostics(
		input: AttentionStageReports,
	): readonly PublicDiagnostic[] {
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
				) && !OrganizerDiagnosticPolicy.derivative(item, merged),
		);
	}
	static complete(input: AttentionStageReports): boolean {
		return ATTENTION_STAGE_OWNERS.every((owner) => {
			const stage = input[owner];
			return (
				stage.outcome === "success" &&
				stage.reported &&
				!stage.diagnostics.some(
					(item) =>
						DiagnosticPolicy.isTechnicalFailure(item) ||
						item.code === "event.concurrently-modified",
				)
			);
		});
	}
	private static organizerPrerequisite(item: PublicDiagnostic): boolean {
		if (item.code === "event.concurrently-modified") return true;
		return (
			DiagnosticPolicy.classify(item) === "organizer" &&
			![
				"communication.approval-pending",
				"communication.approval-rejected",
			].includes(item.code)
		);
	}

	private static eventPrerequisite(
		code: string,
		owner: string,
		eventDiagnostics: readonly PublicDiagnostic[],
	): boolean {
		if (owner === "event") return false;
		return eventDiagnostics.some((item) => {
			if (
				DiagnosticPolicy.classify(item) === "informational" ||
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
