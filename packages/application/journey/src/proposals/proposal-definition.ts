import type {
	ContentDraft,
	ContentPlan,
	ContentTarget,
} from "./promotional-content.js";
export interface ProposalDefinition {
	supports(target: ContentTarget): boolean;
	source(plan: Omit<ContentPlan, "sourceFingerprint">): unknown;
	ready(plan: ContentPlan): boolean;
	valid(plan: ContentPlan, draft: ContentDraft): boolean;
}
