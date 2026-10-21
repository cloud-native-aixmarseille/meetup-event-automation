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

	async execute(
		identity: EventIdentity,
		stageResults: AttentionStageReports,
	): Promise<void> {
		const diagnostics =
			this.collaborators.attentionStageEvaluation.diagnostics(stageResults);
		if (!this.collaborators.attentionStageEvaluation.complete(stageResults))
			return;
		const source = await this.events.find(identity);
		if (!source) throw new Error("Organizer feedback issue is unavailable");
		if (!source.labels.includes(this.meetupLabel)) return;
		await this.comments.reconcileDiagnostics(
			identity,
			diagnostics
				.filter((item) => item.severity !== "info" && item.fixApplied !== true)
				.map((item) => ({
					...item,
					category: item.severity === "error" ? "invalid" : "incomplete",
				})),
		);
	}
}
export type ReconcileOrganizerFeedbackArguments =
	ConstructorParameters<typeof ReconcileOrganizerFeedback> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
