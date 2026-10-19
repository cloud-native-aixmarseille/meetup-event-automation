import {
	ContentProposalTransition,
	DraftProposalComposition,
} from "@meetup-automation/journey";
import { PublicAssetUrl } from "@meetup-automation/publication";
import type { ApprovalPresenter } from "./approval-presenter.js";
import { ContentProposalCodec } from "./content-proposal-codec.js";
import { ContentValueSchema } from "./content-value-schema.js";
import { GithubOrganizerApprovalComposition } from "./dependency-composition.js";
import type { GithubApprovalClient } from "./github-approval-client.js";
import { GithubContentAuthority } from "./github-content-authority.js";
import { GithubContentProposalStore } from "./github-content-proposal-store.js";
import { GithubContentRecoveries } from "./github-content-recoveries.js";
import { GithubContentSubmissions } from "./github-content-submissions.js";

export class GithubContentStoreComposition {
	recoveries(client: GithubApprovalClient): GithubContentRecoveries {
		return new GithubContentRecoveries(
			client,
			new ContentValueSchema(new PublicAssetUrl()),
			new DraftProposalComposition().fingerprints(),
		);
	}
	authority(
		client: GithubApprovalClient,
		author: string,
		presenter: ApprovalPresenter,
	): GithubContentAuthority {
		const adapter = new GithubOrganizerApprovalComposition();
		return new GithubContentAuthority(
			adapter.githubApprovalRepository(
				client,
				adapter.trustedApprovalState(client, author),
				author,
				presenter,
			),
			client,
		);
	}

	store(
		client: GithubApprovalClient,
		author: string,
	): GithubContentProposalStore {
		const fingerprints = new DraftProposalComposition().fingerprints();
		return new GithubContentProposalStore(
			client,
			author,
			new ContentProposalCodec(
				new ContentValueSchema(new PublicAssetUrl()),
				new DraftProposalComposition().policy(),
				fingerprints,
			),
			fingerprints,
			new ContentProposalTransition(fingerprints),
		);
	}
	submissions(client: GithubApprovalClient): GithubContentSubmissions {
		return new GithubContentSubmissions(
			client,
			new ContentValueSchema(new PublicAssetUrl()),
			new DraftProposalComposition().policy(),
			new DraftProposalComposition().fingerprints(),
			new PublicAssetUrl(),
		);
	}
}
