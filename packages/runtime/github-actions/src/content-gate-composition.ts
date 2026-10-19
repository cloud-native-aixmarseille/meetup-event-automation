import { SocialPostTiming } from "@meetup-automation/communication";
import {
	GithubContentStoreComposition,
	GithubOrganizerApprovalComposition,
} from "@meetup-automation/github-organizer-approval";
import {
	ContentFactsProjection,
	ContentPlanFactory,
	EventCopyApprovalGate,
	CoverArtworkApprovalGate,
	DraftProposalComposition,
} from "@meetup-automation/journey";
import { PublicAssetUrl } from "@meetup-automation/publication";
import type { EventDocumentCompositionInput } from "./composition.js";
import { ContentConfiguration } from "./content-configuration.js";
import { GithubActionsComposition } from "./dependency-composition.js";

export class ContentGateComposition {
	create(
		input: EventDocumentCompositionInput,
		issueNumber: number,
		author: string,
	) {
		const adapter = new GithubOrganizerApprovalComposition();
		const client = adapter.githubApprovalClient(
			input.client,
			input.owner,
			input.repo,
			issueNumber,
		);
		const storage = new GithubContentStoreComposition();
		const runtime = new GithubActionsComposition();
		const dependencies: ConstructorParameters<typeof EventCopyApprovalGate> = [
			storage.store(client, author),
			storage.authority(
				client,
				author,
				adapter.approvalPresenter(adapter.approvalMessages(input.locale)),
			),
			new ContentFactsProjection(),
			new ContentPlanFactory(
				new DraftProposalComposition().fingerprints(),
				new SocialPostTiming(),
			),
			new DraftProposalComposition().policy(),
			async () => ({
				publication: await runtime
					.meetupPublicationConfiguration()
					.load(input.workspaceRoot ?? process.cwd()),
				content: await new ContentConfiguration(
					runtime.runtimeInput(),
					new PublicAssetUrl(),
				).load(input.workspaceRoot ?? process.cwd()),
			}),
		];
		const copy = new EventCopyApprovalGate(...dependencies);
		const artwork = new CoverArtworkApprovalGate(...dependencies);
		return {
			blocked: copy.blocked.bind(copy),
			cover: artwork.cover.bind(artwork),
		};
	}
}
