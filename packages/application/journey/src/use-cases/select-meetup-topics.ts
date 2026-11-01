import type {
	MeetupTopicPolicy,
	MeetupTopicSelection,
	ScheduledEvent,
} from "@meetup-automation/publication";
import type { TextGeneration } from "../ports/generation.js";

export class SelectMeetupTopics implements MeetupTopicSelection {
	constructor(
		private readonly generator: TextGeneration,
		private readonly policy: Pick<MeetupTopicPolicy, "brief" | "selection">,
	) {}
	async select(
		event: Pick<ScheduledEvent, "title" | "description">,
		candidates: readonly string[],
	): Promise<readonly string[]> {
		if (!candidates.length || !this.generator.supported())
			throw new Error("Meetup topic selection is unavailable");
		const text = await this.generator.generate(
			this.policy.brief(event, candidates),
		);
		const selected = this.policy.selection(text, candidates);
		if (!selected)
			throw new Error("Meetup topic selection returned invalid candidates");
		return selected;
	}
}
