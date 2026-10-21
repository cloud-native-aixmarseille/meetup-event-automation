import type {
	AssetFolderUrlPolicy,
	AssetFolderUrlPolicyArguments,
} from "./asset-folder-url-policy.js";
import type {
	CommunityEventUrlPolicy,
	CommunityEventUrlPolicyArguments,
} from "./community-event-url-policy.js";
import type {
	MeetupEventUrlPolicy,
	MeetupEventUrlPolicyArguments,
} from "./meetup-event-url-policy.js";
import {
	DEFAULT_PUBLICATION_URL_CONFIGURATION,
	type PublicationUrlConfiguration,
	type PublicationUrlPolicy,
} from "./url-policy-contracts.js";

export interface PublicationUrlPoliciesCollaborators {
	readonly createMeetupEventUrlPolicy: (
		...args: MeetupEventUrlPolicyArguments
	) => MeetupEventUrlPolicy;
	readonly createCommunityEventUrlPolicy: (
		...args: CommunityEventUrlPolicyArguments
	) => CommunityEventUrlPolicy;
	readonly createAssetFolderUrlPolicy: (
		...args: AssetFolderUrlPolicyArguments
	) => AssetFolderUrlPolicy;
}

export class PublicationUrlPolicies {
	constructor(
		private readonly collaborators: PublicationUrlPoliciesCollaborators,
	) {}

	createDefaultPublicationUrlPolicies(
		configuration: PublicationUrlConfiguration = DEFAULT_PUBLICATION_URL_CONFIGURATION,
	): readonly PublicationUrlPolicy[] {
		return Object.freeze([
			this.collaborators.createMeetupEventUrlPolicy(
				configuration.meetupEventUrlPrefix,
			),
			this.collaborators.createCommunityEventUrlPolicy(
				configuration.communityEventUrlPrefixes,
			),
			this.collaborators.createAssetFolderUrlPolicy(
				configuration.assetFolderUrlPrefix,
			),
		]);
	}
}
