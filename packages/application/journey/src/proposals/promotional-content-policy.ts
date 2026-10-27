import type {
	ContentDraft,
	ContentPlan,
	ContentProposal,
	ContentTarget,
} from "./promotional-content.js";
import type { ProposalDefinition } from "./proposal-definition.js";

/** Coordinates review invariants; each business owner defines its own draft contract. */
export class PromotionalContentPolicy {
	constructor(private readonly definitions: readonly ProposalDefinition[]) {}
	target(value: unknown): value is ContentTarget {
		return (
			typeof value === "string" &&
			(/^(title|description|cover)$/.test(value) ||
				/^[a-z][a-z0-9-]{0,63}:(announcement|d7|d0)$/.test(value))
		);
	}
	source(plan: Omit<ContentPlan, "sourceFingerprint">): unknown {
		return this.definition(plan.target).source(plan);
	}
	ready(plan: ContentPlan): boolean {
		return this.definition(plan.target).ready(plan);
	}
	validDraft(plan: ContentPlan, draft: ContentDraft): boolean {
		if (
			draft.text &&
			(draft.text !== draft.text.trim() ||
				/\{[^}]+\}|```|<!--/.test(draft.text))
		)
			return false;
		if (plan.target !== "cover" && !draft.text.trim()) return false;
		return this.definition(plan.target).valid(plan, draft);
	}
	current(proposal: ContentProposal, plan: ContentPlan): boolean {
		return (
			proposal.plan.sourceFingerprint === plan.sourceFingerprint &&
			proposal.promptVersion === "1"
		);
	}
	eligible(proposal: ContentProposal, plan: ContentPlan): boolean {
		return (
			this.current(proposal, plan) &&
			proposal.decision?.status === "approved" &&
			proposal.draft !== null &&
			this.validDraft(plan, proposal.draft)
		);
	}
	private definition(target: ContentTarget): ProposalDefinition {
		const definitions = this.definitions.filter((definition) =>
			definition.supports(target),
		);
		if (definitions.length !== 1)
			throw new Error("Draft target must have exactly one business owner");
		return definitions[0];
	}
}
