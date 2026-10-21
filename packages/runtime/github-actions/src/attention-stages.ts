import { AttentionStageEvaluation } from "@meetup-automation/journey";
import { AttentionStageInput } from "./attention-stage-input.js";
/** Projects external workflow results through the application-owned stage policy. */
export class AttentionStages {
	static parse(value: string) {
		return AttentionStageEvaluation.evaluate(AttentionStageInput.parse(value));
	}
	static diagnostics(value: string) {
		return AttentionStageEvaluation.diagnostics(
			AttentionStageInput.parse(value),
		);
	}
	static hasCompleteReports(value: string): boolean {
		return AttentionStageEvaluation.complete(AttentionStageInput.parse(value));
	}
}
