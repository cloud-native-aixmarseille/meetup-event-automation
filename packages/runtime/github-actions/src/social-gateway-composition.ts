import type {
	SocialDestination,
	SocialImageGateway,
	SocialPublicationGateway,
} from "@meetup-automation/communication";
import { LinkedInSocialGatewayComposition } from "@meetup-automation/linkedin-social-gateway";
import { SlackSocialGatewayComposition } from "@meetup-automation/slack-social-gateway";
import type { SocialCredentials } from "./social-credentials-input.js";

export class SocialGatewayComposition {
	create(
		destinations: readonly SocialDestination[],
		credentials: SocialCredentials,
	): ReadonlyMap<
		string,
		Readonly<{ posts: SocialPublicationGateway; images?: SocialImageGateway }>
	> {
		const gateways = new Map<
			string,
			Readonly<{ posts: SocialPublicationGateway; images?: SocialImageGateway }>
		>();
		for (const destination of destinations) {
			if (destination.provider === "slack") {
				const token = credentials.slack?.[destination.workspaceId];
				if (!token) throw new Error("Missing Slack workspace credential");
				gateways.set(destination.key, {
					posts: new SlackSocialGatewayComposition().gateway(
						destination.workspaceId,
						token,
						fetch,
					),
				});
			} else {
				const token = credentials.linkedin?.accessToken;
				if (!token) throw new Error("Missing LinkedIn credential");
				const composition = new LinkedInSocialGatewayComposition();
				gateways.set(destination.key, {
					posts: composition.gateway(token, fetch),
					images: composition.imageGateway(token, fetch),
				});
			}
		}
		return gateways;
	}
}
