import { createHash } from "node:crypto";
import type {
	LinkedInSocialDestination,
	SocialImageInput,
	SocialPreparedMedia,
} from "@meetup-automation/communication";

export function destination(): LinkedInSocialDestination {
	return {
		provider: "linkedin",
		key: "community",
		label: "Community",
		organizationUrn: "urn:li:organization:123",
	};
}
export function imageInput(): SocialImageInput {
	const bytes = Buffer.from(
		"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH7sAAAAASUVORK5CYII=",
		"base64",
	);
	return {
		destination: destination(),
		bytes,
		mimeType: "image/png",
		fingerprint: createHash("sha256").update(bytes).digest("hex"),
		description: "Meetup announcement illustration",
	};
}
export function media(): SocialPreparedMedia {
	return {
		assetUrn: "urn:li:image:AbC123",
		fingerprint: imageInput().fingerprint,
		description: imageInput().description,
	};
}
export function json(payload: unknown, status = 200): Response {
	return new Response(JSON.stringify(payload), { status });
}
export function initialized(): Response {
	return json({
		value: {
			image: media().assetUrn,
			uploadUrl:
				"https://www.linkedin.com/dms-uploads/AbC123/uploaded-image/0?ut=private-signature",
		},
	});
}
export function imageStatus(
	status = "AVAILABLE",
	owner = destination().organizationUrn,
): Response {
	return json({
		id: media().assetUrn,
		owner,
		status,
		downloadUrl: "https://media.example.test/private-url",
	});
}
