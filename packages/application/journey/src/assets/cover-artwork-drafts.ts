import type { CoverArtwork } from "@meetup-automation/publication";
import type { ImageGenerationBrief } from "../ports/generation.js";
import type {
	ContentDraft,
	ContentPlan,
	ContentTarget,
} from "../proposals/promotional-content.js";
import type { ProposalDefinition } from "../proposals/proposal-definition.js";

export class CoverArtworkDrafts implements ProposalDefinition {
	constructor(private readonly artwork: CoverArtwork) {}
	supports(target: ContentTarget): boolean {
		return target === "cover";
	}
	source(plan: Omit<ContentPlan, "sourceFingerprint">): unknown {
		return this.artwork.source(plan.facts);
	}
	ready(plan: ContentPlan): boolean {
		return this.artwork.ready(plan.facts);
	}
	valid(_plan: ContentPlan, draft: ContentDraft): boolean {
		return this.artwork.valid(draft.text, draft.media.length);
	}
	directions(): readonly string[] {
		return this.artwork.directions;
	}
	brief(
		plan: ContentPlan,
		direction: string,
		guidance: string,
	): ImageGenerationBrief {
		if (!this.supports(plan.target))
			throw new Error("Unsupported cover artwork target");
		return this.artwork.brief(plan.facts, direction, guidance);
	}
}
