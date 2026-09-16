import { AssetFolderUrlPolicy } from "./asset-folder-url-policy.js";
import { CommunityEventUrlPolicy } from "./community-event-url-policy.js";
import { MeetupEventUrlPolicy } from "./meetup-event-url-policy.js";
import {
	DEFAULT_PUBLICATION_URL_CONFIGURATION,
	type PublicationUrlConfiguration,
	type PublicationUrlPolicy,
} from "./url-policy-contracts.js";

export class PublicationUrlPolicies {
	static createDefaultPublicationUrlPolicies(
		configuration: PublicationUrlConfiguration = DEFAULT_PUBLICATION_URL_CONFIGURATION,
	): readonly PublicationUrlPolicy[] {
		return Object.freeze([
			new MeetupEventUrlPolicy(configuration.meetupEventUrlPrefix),
			new CommunityEventUrlPolicy(configuration.communityEventUrlPrefixes),
			new AssetFolderUrlPolicy(configuration.assetFolderUrlPrefix),
		]);
	}
}
