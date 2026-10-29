import type { ContentSubmissions } from "../ports/content-submissions.js";
import type { ContentProposalStore } from "../proposals/promotional-content-ports.js";

export class ContentReviewWork {
	constructor(
		private readonly store: Pick<ContentProposalStore, "load">,
		private readonly submissions: Pick<ContentSubmissions, "read">,
	) {}
	async exists(): Promise<boolean> {
		if ((await this.store.load()).proposals.length > 0) return true;
		return (await this.submissions.read()).length > 0;
	}
}
