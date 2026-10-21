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
				placeholders: Object.entries(intent.placeholders)
					.sort(([a], [b]) => a.localeCompare(b))
					.map(([key, value]) => [
						key,
						typeof value === "string"
							? value
							: value.map(({ title, url }) => ({ title, url })),
					]),
			}))
			.sort((a, b) => a.id.localeCompare(b.id));
		// Recipient and placeholder keys are ordered; feedback talk order is
		// visible email content, with each talk encoded as title then URL.
		return createHash("sha256")
			.update(JSON.stringify({ eventDate, timeZone, messages }))
			.digest("hex");
	}
}
