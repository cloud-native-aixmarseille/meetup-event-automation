import { LinkedInCommentary } from "./linkedin-commentary.js";
import { LinkedInImageGateway } from "./linkedin-image-gateway.js";
import { LinkedInImageStatus } from "./linkedin-image-status.js";
import { LinkedInImageValidation } from "./linkedin-image-validation.js";
import {
	LinkedInSocialClient,
	type LinkedInSocialFetch,
} from "./linkedin-social-client.js";
import { LinkedInSocialGateway } from "./linkedin-social-gateway.js";

export class LinkedInSocialGatewayComposition {
	gateway(token: string, fetcher: LinkedInSocialFetch): LinkedInSocialGateway {
		const client = new LinkedInSocialClient(token, fetcher);
		return new LinkedInSocialGateway(
			client,
			new LinkedInImageStatus(client),
			new LinkedInCommentary(),
		);
	}

	imageGateway(
		token: string,
		fetcher: LinkedInSocialFetch,
	): LinkedInImageGateway {
		const client = new LinkedInSocialClient(token, fetcher);
		return new LinkedInImageGateway(
			client,
			new LinkedInImageValidation(),
			new LinkedInImageStatus(client),
		);
	}
}
