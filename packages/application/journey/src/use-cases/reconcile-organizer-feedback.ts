import type {
	EventCommentRepository,
	EventDocumentCodec,
	EventIdentity,
	EventRepository,
} from "@meetup-automation/event";
import { MeetupEventUrl } from "@meetup-automation/publication";
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
		private readonly codec: Pick<EventDocumentCodec, "decode">,
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
		const meetup = MeetupEventUrl.parse(
			this.codec.decode(source).event.publicationLinks.meetup,
		)?.value;
		if (baseComplete)
			await this.reconcile(
				identity,
				{ ...stageResults, social: undefined },
				{ meetup },
			);
		if (socialComplete)
			await this.reconcile(identity, stageResults, { meetup }, "social");
		return { updated: true };
	}
	private async reconcile(
		identity: EventIdentity,
		stageResults: AttentionStageReports,
		links: Readonly<{ meetup?: string }>,
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
		await this.comments.reconcileDiagnostics(
			identity,
			actionable,
			links,
			scope,
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
