import { createHash } from "node:crypto";
import type { SocialImageInput } from "@meetup-automation/communication";
import { imageSize } from "image-size";

/** Validates the exact approved bytes, without downloading or replacing media. */
export class LinkedInImageValidation {
	valid(input: SocialImageInput): boolean {
		if (
			!/^urn:li:organization:[1-9]\d*$/.test(
				input.destination.organizationUrn,
			) ||
			!input.description.trim() ||
			input.description.length > 4086 ||
			input.bytes.length === 0 ||
			input.bytes.length >= 50_000_000 ||
			!/^[a-f0-9]{64}$/.test(input.fingerprint) ||
			createHash("sha256").update(input.bytes).digest("hex") !==
				input.fingerprint
		)
			return false;
		try {
			const size = imageSize(input.bytes);
			const types: Readonly<Record<string, string>> = {
				png: "image/png",
				jpg: "image/jpeg",
				gif: "image/gif",
			};
			return Boolean(
				size.type &&
					types[size.type] === input.mimeType &&
					size.width &&
					size.height &&
					size.width * size.height < 36_152_320,
			);
		} catch {
			return false;
		}
	}
}
