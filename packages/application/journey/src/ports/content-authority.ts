import type { ContentProposal } from "../proposals/promotional-content.js";
export interface ContentAuthority {
	authorized(proposal: ContentProposal): Promise<boolean>;
}
