import type {
	LinkedInSocialDestination,
	SocialMediaResult,
	SocialPreparedMedia,
} from "@meetup-automation/communication";
import type { LinkedInSocialClient } from "./linkedin-social-client.js";

/** Media ownership and readiness are checked again immediately before posting. */
export class LinkedInImageStatus {
	constructor(private readonly client: Pick<LinkedInSocialClient, "request">) {}

	async inspect(
		destination: LinkedInSocialDestination,
		media: SocialPreparedMedia,
	): Promise<SocialMediaResult> {
		const result = await this.client.request(
			`images/${encodeURIComponent(media.assetUrn)}`,
			"GET",
		);
		if (result.status !== "success")
			return result.status === "uncertain"
				? { status: "deferred", code: "media-unavailable" }
				: result;
		let payload: unknown;
		try {
			payload = await result.response.json();
		} catch {
			return { status: "deferred", code: "media-unavailable" };
		}
		if (
			typeof payload !== "object" ||
			payload === null ||
			Array.isArray(payload)
		)
			return { status: "deferred", code: "media-unavailable" };
		const image = payload as Record<string, unknown>;
		if (
			image.id !== media.assetUrn ||
			image.owner !== destination.organizationUrn
		)
			return { status: "rejected", code: "media-owner-mismatch" };
		if (image.status === "AVAILABLE") return { status: "ready", media };
		if (image.status === "PROCESSING")
			return {
				status: "deferred",
				code: "media-processing",
				retryAfterSeconds: 60,
			};
		if (image.status === "PROCESSING_FAILED")
			return { status: "rejected", code: "media-processing-failed" };
		return { status: "uncertain", code: "media-upload-unconfirmed" };
	}
}
