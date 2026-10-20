import type {
	EventCommentRepository,
	EventIdentity,
	EventRepository,
} from "@meetup-automation/event";
import { AttentionStages } from "./attention-stages.js";

/** Publish one checklist after all independently executed stages have reported. */
export class OrganizerFeedback {
	constructor(
		private readonly events: EventRepository,
		private readonly comments: EventCommentRepository,
		private readonly meetupLabel: string,
	) {}

	async execute(identity: EventIdentity, stageResults: string): Promise<void> {
		const diagnostics = AttentionStages.diagnostics(stageResults);
		if (!AttentionStages.hasCompleteReports(stageResults)) return;
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
