import type {
	SocialDispatchResult,
	SocialPostInput,
	SocialPublicationGateway,
} from "@meetup-automation/communication";
import type { LinkedInCommentary } from "./linkedin-commentary.js";
import type { LinkedInImageStatus } from "./linkedin-image-status.js";
import type { LinkedInSocialClient } from "./linkedin-social-client.js";

export class LinkedInSocialGateway implements SocialPublicationGateway {
	constructor(
		private readonly client: Pick<LinkedInSocialClient, "request">,
		private readonly imageStatus: Pick<LinkedInImageStatus, "inspect">,
		private readonly commentary: Pick<LinkedInCommentary, "encode">,
	) {}

	async publish(
		input: SocialPostInput,
		beforeWrite: () => Promise<void>,
	): Promise<SocialDispatchResult> {
		if (input.destination.provider !== "linkedin" || !this.valid(input))
			return { status: "rejected", code: "invalid-request" };
		if (input.media) {
			const media = await this.imageStatus.inspect(
				input.destination,
				input.media,
			);
			if (media.status !== "ready") return media;
		}
		await beforeWrite();
		const result = await this.client.request("posts", "POST", {
			author: input.destination.organizationUrn,
			commentary: this.commentary.encode(input.text),
			visibility: "PUBLIC",
			distribution: {
				feedDistribution: "MAIN_FEED",
				targetEntities: [],
				thirdPartyDistributionChannels: [],
			},
			...(input.media
				? {
						content: {
							media: {
								id: input.media.assetUrn,
								altText: input.media.description,
							},
						},
					}
				: {}),
			lifecycleState: "PUBLISHED",
			isReshareDisabledByAuthor: false,
		});
		if (result.status !== "success") return result;
		const postUrn = result.response.headers.get("x-restli-id");
		if (
			result.response.status !== 201 ||
			!postUrn ||
			!/^urn:li:(?:share|ugcPost):[1-9]\d*$/.test(postUrn)
		)
			return { status: "uncertain", code: "ambiguous-response" };
		return {
			status: "accepted",
			receipt: {
				provider: "linkedin",
				organizationUrn: input.destination.organizationUrn,
				postUrn,
				url: `https://www.linkedin.com/feed/update/${postUrn}/`,
			},
		};
	}

	private valid(input: SocialPostInput): boolean {
		return (
			input.destination.provider === "linkedin" &&
			/^urn:li:organization:[1-9]\d*$/.test(
				input.destination.organizationUrn,
			) &&
			Boolean(input.text.trim()) &&
			input.text.length <= 3000 &&
			!/@\[[^\]]*\]\(urn:li:/.test(input.text) &&
			(!input.media ||
				(/^urn:li:image:[A-Za-z0-9_-]+$/.test(input.media.assetUrn) &&
					/^[a-f0-9]{64}$/.test(input.media.fingerprint) &&
					Boolean(input.media.description.trim()) &&
					input.media.description.length <= 4086))
		);
	}
}
