import type {
	ContentAuthority,
	ContentProposal,
} from "@meetup-automation/journey";
import type { GithubApprovalClient } from "./github-approval-client.js";
import type { GithubApprovalRepository } from "./github-approval-repository.js";

export class GithubContentAuthority implements ContentAuthority {
	constructor(
		private readonly approvals: Pick<GithubApprovalRepository, "states">,
		private readonly client: Pick<GithubApprovalClient, "canApprove">,
	) {}
	async authorized(proposal: ContentProposal): Promise<boolean> {
		const record = (await this.approvals.states()).find(
			(state) =>
				state.record.kind === "content-review" &&
				state.record.content.key === proposal.id,
		)?.record;
		return (
			record?.kind === "content-review" &&
			record.revision === proposal.revision &&
			record.decision?.status === "approved" &&
			record.decision.actor === proposal.decision?.actor &&
			record.decision.decidedAt === proposal.decision?.decidedAt &&
			record.decision.selectedImage === proposal.decision?.selectedImage &&
			record.decision.editedText === proposal.decision?.editedText &&
			(await this.client.canApprove(record.decision.actor))
		);
	}
}
