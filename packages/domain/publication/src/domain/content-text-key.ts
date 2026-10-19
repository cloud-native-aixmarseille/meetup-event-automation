import type { TextField, TextKey } from "./asset-content.js";
import type { ContentFingerprint } from "./content-fingerprint.js";

export class ContentTextKey {
	constructor(private readonly fingerprints: Pick<ContentFingerprint, "of">) {}

	of(field: Pick<TextField, "token" | "slot" | "format">): TextKey {
		return (
			field.format !== undefined
				? `${field.token}:format:${this.fingerprints.of(field.format)}`
				: this.reference(field)
		) as TextKey;
	}

	reference(field: Pick<TextField, "token" | "slot" | "format">): string {
		const argument = field.format ?? field.slot;
		return argument === undefined ? field.token : `${field.token}:${argument}`;
	}
}
