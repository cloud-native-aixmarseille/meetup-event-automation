import type {
	ContentProposal,
	ContentRecoveryRequest,
	PromotionalContentSnapshot,
} from "./promotional-content.js";
export interface ContentProposalStore {
	load(): Promise<PromotionalContentSnapshot>;
	save(
		previous: PromotionalContentSnapshot,
		proposals: readonly ContentProposal[],
	): Promise<PromotionalContentSnapshot>;
}
export interface ContentRecoveryRequests {
	read(): Promise<readonly ContentRecoveryRequest[]>;
}
