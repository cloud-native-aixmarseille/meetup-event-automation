import type { OrganizerApprovalRequest } from "@meetup-automation/journey";
import type { ContentValueSchema } from "./content-value-schema.js";

type SocialDetails = Extract<
	OrganizerApprovalRequest,
	{ kind: "social-publication" }
>["social"];

export class SocialPublicationApprovalSchema {
	constructor(private readonly values: ContentValueSchema) {}

	validate(value: unknown): asserts value is SocialDetails {
		const item = this.values.object(value, [
			"intentId",
			"target",
			"destinationLabel",
			"destinationIdentity",
			"text",
			"media",
			"plannedAt",
			"expiresAt",
			"recovery",
		]);
		for (const field of [
			"intentId",
			"target",
			"destinationLabel",
			"destinationIdentity",
		])
			if (
				!this.values.text(item[field], 200).trim() ||
				/[\r\n]/.test(String(item[field]))
			)
				throw new Error("Invalid social publication identity");
		if (!this.values.text(item.text, 2800).trim())
			throw new Error("Missing social publication text");
		for (const media of this.values.list(item.media, 1))
			this.values.media(media);
		const plannedAt = this.values.text(item.plannedAt, 40);
		const expiresAt = this.values.text(item.expiresAt, 40);
		if (
			(plannedAt !== "after-approval" &&
				!Number.isFinite(Date.parse(plannedAt))) ||
			!Number.isFinite(Date.parse(expiresAt)) ||
			(plannedAt !== "after-approval" &&
				Date.parse(plannedAt) >= Date.parse(expiresAt))
		)
			throw new Error("Invalid social publication window");
		if (item.recovery !== undefined) this.recovery(item.recovery);
	}

	private recovery(value: unknown): void {
		const item = this.values.object(value, ["outcome", "reference"]);
		if (item.outcome !== "published" && item.outcome !== "not-published")
			throw new Error("Invalid social publication recovery outcome");
		if (!this.values.text(item.reference, 2000).trim())
			throw new Error("Missing social publication recovery evidence");
	}
}
