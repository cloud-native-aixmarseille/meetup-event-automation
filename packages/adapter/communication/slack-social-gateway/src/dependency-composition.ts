import {
	SlackSocialClient,
	type SlackSocialFetch,
} from "./slack-social-client.js";
import { SlackSocialGateway } from "./slack-social-gateway.js";

export class SlackSocialGatewayComposition {
	gateway(
		workspaceId: string,
		token: string,
		fetcher: SlackSocialFetch,
	): SlackSocialGateway {
		return new SlackSocialGateway(
			workspaceId,
			new SlackSocialClient(token, fetcher),
		);
	}
}
