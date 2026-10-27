import type {
	SocialImageGateway,
	SocialImageInput,
	SocialMediaResult,
	SocialPreparedMedia,
} from "@meetup-automation/communication";
import type { LinkedInImageStatus } from "./linkedin-image-status.js";
import type { LinkedInImageValidation } from "./linkedin-image-validation.js";
import type { LinkedInSocialClient } from "./linkedin-social-client.js";

export class LinkedInImageGateway implements SocialImageGateway {
	constructor(
		private readonly client: Pick<
			LinkedInSocialClient,
			"request" | "upload" | "validUploadUrl"
		>,
		private readonly validation: Pick<LinkedInImageValidation, "valid">,
		private readonly status: Pick<LinkedInImageStatus, "inspect">,
	) {}

	async prepare(
		input: SocialImageInput,
		beforeWrite: () => Promise<void>,
		record: (media: SocialPreparedMedia) => Promise<void>,
	): Promise<SocialMediaResult> {
		const snapshot = { ...input, bytes: new Uint8Array(input.bytes) };
		if (!this.validation.valid(snapshot))
			return { status: "rejected", code: "invalid-media" };
		await beforeWrite();
		const initialized = await this.client.request(
			"images?action=initializeUpload",
			"POST",
			{
				initializeUploadRequest: {
					owner: snapshot.destination.organizationUrn,
				},
			},
		);
		if (initialized.status !== "success") return initialized;
		const upload = await this.readUpload(initialized.response);
		if (!upload) return { status: "uncertain", code: "ambiguous-response" };
		const media: SocialPreparedMedia = {
			assetUrn: upload.image,
			fingerprint: snapshot.fingerprint,
			description: snapshot.description,
		};
		// Durably retain only the identity and reviewed content, never the signed URL.
		await record(media);
		await beforeWrite();
		const uploaded = await this.client.upload(
			upload.url,
			snapshot.bytes,
			snapshot.mimeType,
		);
		if (uploaded.status !== "success") return uploaded;
		return this.status.inspect(snapshot.destination, media);
	}

	private async readUpload(
		response: Response,
	): Promise<{ image: string; url: string } | undefined> {
		let payload: unknown;
		try {
			payload = await response.json();
		} catch {
			return undefined;
		}
		if (
			typeof payload !== "object" ||
			payload === null ||
			!("value" in payload)
		)
			return undefined;
		const value = payload.value;
		if (
			typeof value !== "object" ||
			value === null ||
			!("image" in value) ||
			!("uploadUrl" in value)
		)
			return undefined;
		if (
			typeof value.image !== "string" ||
			!/^urn:li:image:[A-Za-z0-9_-]+$/.test(value.image) ||
			!this.client.validUploadUrl(value.uploadUrl)
		)
			return undefined;
		return { image: value.image, url: value.uploadUrl };
	}
}
