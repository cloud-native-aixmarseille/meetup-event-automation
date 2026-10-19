import type {
	EventCopyDescriptionDraft,
	EventCopyTitleDraft,
} from "@meetup-automation/event";
import type {
	ContentDraft,
	ContentPlan,
	ContentTarget,
} from "../proposals/promotional-content.js";
import type { ProposalDefinition } from "../proposals/proposal-definition.js";

export class EventCopyDrafts implements ProposalDefinition {
	constructor(
		private readonly title: EventCopyTitleDraft,
		private readonly description: EventCopyDescriptionDraft,
	) {}
	supports(target: ContentTarget): boolean {
		return target === "title" || target === "description";
	}
	source(plan: Omit<ContentPlan, "sourceFingerprint">): unknown {
		return plan.target === "title"
			? this.title.source(plan.facts.talks)
			: this.description.source(plan.facts);
	}
	ready(plan: ContentPlan): boolean {
		return plan.target === "title"
			? this.title.ready(plan.facts.talks)
			: this.description.ready(plan.facts);
	}
	valid(plan: ContentPlan, draft: ContentDraft): boolean {
		return (
			draft.media.length === 0 &&
			(plan.target === "title"
				? this.title.valid(draft.text)
				: this.description.valid(plan.facts, draft.text))
		);
	}
	brief(plan: ContentPlan, guidance: string) {
		if (!this.supports(plan.target))
			throw new Error("Unsupported event copy target");
		return plan.target === "title"
			? this.title.brief(plan.facts.talks, plan.language, guidance)
			: this.description.brief(plan.facts, plan.language, guidance);
	}
	media(): ContentDraft["media"] {
		return [];
	}
}
