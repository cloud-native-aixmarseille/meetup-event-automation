import type {
	ContentOrigin,
	ContentPlan,
	ContentProposal,
} from "./promotional-content.js";

export class ContentProposalFactory {
	constructor(
		private readonly nextIdentity: () => string,
		private readonly now: () => string,
	) {}
	create(
		plan: ContentPlan,
		origin: ContentOrigin,
		guidance: string,
		destinationBefore: string | null,
	): ContentProposal {
		if (guidance.length > 2000)
			throw new Error("Content guidance limit exceeded");
		return {
			version: 1,
			promptVersion: "1",
			id: `content-${this.nextIdentity()}`,
			plan,
			origin,
			guidance,
			createdAt: this.now(),
			destinationBefore,
			attempts: [],
			draft: null,
			revision: null,
			decision: null,
			accepted: null,
		};
	}
}
