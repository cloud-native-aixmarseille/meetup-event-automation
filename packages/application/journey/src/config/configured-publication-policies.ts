import {
	DEFAULT_PUBLICATION_URL_CONFIGURATION,
	PublicationUrlPolicies,
	type PublicationUrlPolicy,
} from "@meetup-automation/publication";
import type { AutomationConfig } from "./automation-config.js";

/** Apply the same configured publication identities throughout the journey. */
export class ConfiguredPublicationPolicies {
	static create(
		publication: AutomationConfig["publication"],
	): readonly PublicationUrlPolicy[] {
		return PublicationUrlPolicies.createDefaultPublicationUrlPolicies({
			...DEFAULT_PUBLICATION_URL_CONFIGURATION,
			meetupEventUrlPrefix: publication["meetup-event-url-prefix"],
			communityEventUrlPrefixes: [
				publication["cncf-event-url-prefix"],
				...DEFAULT_PUBLICATION_URL_CONFIGURATION.communityEventUrlPrefixes.slice(
					1,
				),
			],
		});
	}
}
