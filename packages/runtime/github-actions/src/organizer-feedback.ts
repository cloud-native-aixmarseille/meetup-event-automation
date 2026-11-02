import type {
	EventCommentRepository,
	EventDocumentCodec,
	EventIdentity,
	EventRepository,
} from "@meetup-automation/event";
import type {
	ReconcileOrganizerFeedback,
	ReconcileOrganizerFeedbackArguments,
} from "@meetup-automation/journey";
import type { AttentionStageInput } from "./attention-stage-input.js";
/** Runtime input adapter for the merged organizer feedback use case. */
export interface OrganizerFeedbackCollaborators {
	readonly attentionStageInput: Pick<AttentionStageInput, "parse">;
	readonly createReconcileOrganizerFeedback: (
		...args: ReconcileOrganizerFeedbackArguments
	) => ReconcileOrganizerFeedback;
}

export class OrganizerFeedback {
	private readonly reconciliation: ReconcileOrganizerFeedback;
	constructor(
		private readonly collaborators: OrganizerFeedbackCollaborators,
		events: EventRepository,
		comments: EventCommentRepository,
		meetupLabel: string,
		codec: Pick<EventDocumentCodec, "decode">,
	) {
		this.reconciliation = this.collaborators.createReconcileOrganizerFeedback(
			events,
			comments,
			meetupLabel,
			codec,
		);
	}
	async execute(identity: EventIdentity, stageResults: string) {
		return this.reconciliation.execute(
			identity,
			this.collaborators.attentionStageInput.parse(stageResults),
		);
	}
}
export type OrganizerFeedbackArguments =
	ConstructorParameters<typeof OrganizerFeedback> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
