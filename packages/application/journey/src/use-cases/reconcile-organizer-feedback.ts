import type {
	EventCommentRepository,
	EventIdentity,
	EventRepository,
} from "@meetup-automation/event";
import type { AttentionStageEvaluation } from "../result/attention-stage-evaluation.js";
import type { AttentionStageReports } from "../result/attention-stage-reports.js";

/** Publish one checklist after all independently executed stages have reported. */
export interface ReconcileOrganizerFeedbackCollaborators {
	readonly attentionStageEvaluation: Pick<
		AttentionStageEvaluation,
		"diagnostics" | "complete"
	>;
}

export class ReconcileOrganizerFeedback {
	constructor(
		private readonly collaborators: ReconcileOrganizerFeedbackCollaborators,
		private readonly events: EventRepository,
		private readonly comments: EventCommentRepository,
		private readonly meetupLabel: string,
	) {}

	async execute(identity: EventIdentity, stageResults: AttentionStageReports) {
		const diagnostics =
			this.collaborators.attentionStageEvaluation.diagnostics(stageResults);
		if (!this.collaborators.attentionStageEvaluation.complete(stageResults))
			return { updated: false };
		const source = await this.events.find(identity);
		if (!source) throw new Error("Organizer feedback issue is unavailable");
		if (!source.labels.includes(this.meetupLabel)) return { updated: false };
		await this.comments.reconcileDiagnostics(
			identity,
			diagnostics
				.filter((item) => item.severity !== "info" && item.fixApplied !== true)
				.map((item) => ({
					...item,
					category: item.severity === "error" ? "invalid" : "incomplete",
				})),
		);
		return { updated: true };
	}
}
export type ReconcileOrganizerFeedbackArguments =
	ConstructorParameters<typeof ReconcileOrganizerFeedback> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
