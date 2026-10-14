import { createHash } from "node:crypto";
import type { MailMessageIntent } from "./model.js";

/** Only the digest leaves the mail context; private payloads are never approval records. */
export class MailBatchFingerprint {
	static create(
		eventDate: string,
		timeZone: string,
		intents: readonly MailMessageIntent[],
	): string {
		const messages = intents
			.map((intent) => ({
				id: intent.idempotencyKey,
				destination: intent.recipient.email,
				template: intent.templateName,
				placeholders: Object.entries(intent.placeholders).sort(([a], [b]) =>
					a.localeCompare(b),
				),
			}))
			.sort((a, b) => a.id.localeCompare(b.id));
		return createHash("sha256")
			.update(JSON.stringify({ eventDate, timeZone, messages }))
			.digest("hex");
	}
}
