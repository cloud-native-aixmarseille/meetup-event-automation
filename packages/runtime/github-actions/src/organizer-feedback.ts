import type {
	EventCommentRepository,
	EventIdentity,
	EventRepository,
} from "@meetup-automation/event";
import { ReconcileOrganizerFeedback } from "@meetup-automation/journey";
import { AttentionStageInput } from "./attention-stage-input.js";
/** Runtime input adapter for the merged organizer feedback use case. */
export class OrganizerFeedback {
	private readonly reconciliation: ReconcileOrganizerFeedback;
	constructor(
		events: EventRepository,
		comments: EventCommentRepository,
		meetupLabel: string,
	) {
		this.reconciliation = new ReconcileOrganizerFeedback(
			events,
			comments,
			meetupLabel,
		);
	}
	async execute(identity: EventIdentity, stageResults: string): Promise<void> {
		await this.reconciliation.execute(
			identity,
			AttentionStageInput.parse(stageResults),
		);
	}
}
