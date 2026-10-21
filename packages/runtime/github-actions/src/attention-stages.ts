import type { AttentionStageEvaluation } from "@meetup-automation/journey";
import type { AttentionStageInput } from "./attention-stage-input.js";
/** Projects external workflow results through the application-owned stage policy. */
export interface AttentionStagesCollaborators {
	readonly attentionStageEvaluation: Pick<
		AttentionStageEvaluation,
		"evaluate" | "diagnostics" | "complete"
	>;
	readonly attentionStageInput: Pick<AttentionStageInput, "parse">;
}

export class AttentionStages {
	constructor(private readonly collaborators: AttentionStagesCollaborators) {}

	parse(value: string) {
		return this.collaborators.attentionStageEvaluation.evaluate(
			this.collaborators.attentionStageInput.parse(value),
		);
	}
	diagnostics(value: string) {
		return this.collaborators.attentionStageEvaluation.diagnostics(
			this.collaborators.attentionStageInput.parse(value),
		);
	}
	hasCompleteReports(value: string): boolean {
		return this.collaborators.attentionStageEvaluation.complete(
			this.collaborators.attentionStageInput.parse(value),
		);
	}
}
