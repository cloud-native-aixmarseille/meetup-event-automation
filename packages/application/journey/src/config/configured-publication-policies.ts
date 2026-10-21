import {
	DEFAULT_PUBLICATION_URL_CONFIGURATION,
	type PublicationUrlPolicies,
	type PublicationUrlPolicy,
} from "@meetup-automation/publication";
import type { AutomationConfig } from "./automation-config.js";

/** Apply the same configured publication identities throughout the journey. */
export interface ConfiguredPublicationPoliciesCollaborators {
	readonly publicationUrlPolicies: Pick<
		PublicationUrlPolicies,
		"createDefaultPublicationUrlPolicies"
	>;
}

export class ConfiguredPublicationPolicies {
	constructor(
		private readonly collaborators: ConfiguredPublicationPoliciesCollaborators,
	) {}

	create(
		publication: AutomationConfig["publication"],
	): readonly PublicationUrlPolicy[] {
		return this.collaborators.publicationUrlPolicies.createDefaultPublicationUrlPolicies(
			{
				...DEFAULT_PUBLICATION_URL_CONFIGURATION,
				meetupEventUrlPrefix: publication["meetup-event-url-prefix"],
				communityEventUrlPrefixes: [
					publication["cncf-event-url-prefix"],
					...DEFAULT_PUBLICATION_URL_CONFIGURATION.communityEventUrlPrefixes.slice(
						1,
					),
				],
			},
		);
	}
}
