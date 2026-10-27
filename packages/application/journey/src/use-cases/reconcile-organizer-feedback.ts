import type {
	EventCommentRepository,
	EventIdentity,
	EventRepository,
} from "@meetup-automation/event";
import type { AttentionStageEvaluation } from "../result/attention-stage-evaluation.js";
import type { AttentionStageReports } from "../result/attention-stage-reports.js";

/** Refresh independently evaluated scopes in the single organizer checklist. */
export interface ReconcileOrganizerFeedbackCollaborators {
	readonly attentionStageEvaluation: Pick<
		AttentionStageEvaluation,
		"diagnostics" | "complete" | "socialComplete"
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
		const baseComplete =
			this.collaborators.attentionStageEvaluation.complete(stageResults);
		const socialComplete =
			this.collaborators.attentionStageEvaluation.socialComplete(stageResults);
		if (!baseComplete && !socialComplete) return { updated: false };
		const source = await this.events.find(identity);
		if (!source) throw new Error("Organizer feedback issue is unavailable");
		if (!source.labels.includes(this.meetupLabel)) return { updated: false };
		if (baseComplete)
			await this.reconcile(identity, { ...stageResults, social: undefined });
		if (socialComplete) await this.reconcile(identity, stageResults, "social");
		return { updated: true };
	}
	private async reconcile(
		identity: EventIdentity,
		stageResults: AttentionStageReports,
		scope?: "social",
	) {
		const diagnostics =
			scope === "social"
				? (stageResults.social?.diagnostics ?? [])
				: this.collaborators.attentionStageEvaluation.diagnostics(stageResults);
		const actionable = diagnostics
			.filter((item) => item.severity !== "info" && item.fixApplied !== true)
			.map((item) => ({
				...item,
				category:
					item.severity === "error"
						? ("invalid" as const)
						: ("incomplete" as const),
			}));
		if (scope)
			await this.comments.reconcileDiagnostics(identity, actionable, scope);
		else await this.comments.reconcileDiagnostics(identity, actionable);
	}
}
export type ReconcileOrganizerFeedbackArguments =
	ConstructorParameters<typeof ReconcileOrganizerFeedback> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
