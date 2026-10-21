import { createHash } from "node:crypto";

export class ContentFingerprint {
	of(value: string | Uint8Array): string {
		return createHash("sha256").update(value).digest("hex");
	}
}
