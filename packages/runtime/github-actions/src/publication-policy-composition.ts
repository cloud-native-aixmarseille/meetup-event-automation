import { PublicationDomainComposition } from "@meetup-automation/publication";
import { GithubActionsComposition } from "./dependency-composition.js";

/** Bind each URL policy to its own validated deployment setting. */
export class PublicationPolicyComposition {
	meetupEventUrlPolicy(prefix: string) {
		return new PublicationDomainComposition().meetupEventUrlPolicy(
			new GithubActionsComposition()
				.publicationUrlInput()
				.validateMeetupEventUrlPrefix(prefix),
		);
	}

	communityEventUrlPolicy(prefixes: readonly string[]) {
		return new PublicationDomainComposition().communityEventUrlPolicy(
			new GithubActionsComposition()
				.publicationUrlInput()
				.validateCommunityEventUrlPrefixes(prefixes),
		);
	}

	assetFolderUrlPolicy(prefix: string) {
		return new PublicationDomainComposition().assetFolderUrlPolicy(
			new GithubActionsComposition()
				.publicationUrlInput()
				.validateAssetFolderUrlPrefix(prefix),
		);
	}

	eventPublicationUrlPolicyEngine(
		meetupEventUrlPrefix: string,
		communityEventUrlPrefixes: readonly string[],
		assetFolderUrlPrefix: string,
	) {
		return new PublicationDomainComposition().publicationUrlPolicyEngine([
			this.meetupEventUrlPolicy(meetupEventUrlPrefix),
			this.communityEventUrlPolicy(communityEventUrlPrefixes),
			this.assetFolderUrlPolicy(assetFolderUrlPrefix),
		]);
	}
}
