import type {
	ContentApprovalDetails,
	PromotionalContentPolicy,
} from "@meetup-automation/journey";
import type { ApprovalSchema } from "./approval-schema.js";
import type { ContentValueSchema } from "./content-value-schema.js";
export class ContentApprovalSchema {
	constructor(
		private readonly schema: Pick<ApprovalSchema, "object">,
		private readonly policy: Pick<PromotionalContentPolicy, "target">,
		private readonly values: ContentValueSchema,
	) {}
	validate(value: unknown): asserts value is ContentApprovalDetails {
		if (
			!this.schema.object(value) ||
			typeof value.key !== "string" ||
			!/^content-[a-f0-9-]{36}$/.test(value.key) ||
			!this.policy.target(value.target) ||
			!["en", "fr"].includes(String(value.language)) ||
			typeof value.origin !== "string" ||
			!value.origin ||
			value.origin.length > 200
		)
			throw new Error("Invalid content approval");
		this.values.object(value, [
			"key",
			"target",
			"language",
			"origin",
			"draft",
			"plannedAt",
			"attempts",
		]);
		const draft = this.values.draft(value.draft);
		if (value.target === "cover" && (!draft.media.length || draft.text))
			throw new Error("Invalid cover preview");
		if (value.target !== "cover" && !draft.text.trim())
			throw new Error("Missing content preview");
		this.schedule(value);
	}
	private schedule(value: Record<string, unknown>): void {
		if (
			value.plannedAt !== undefined &&
			(typeof value.plannedAt !== "string" ||
				!Number.isFinite(Date.parse(value.plannedAt)))
		)
			throw new Error("Invalid planned publication time");
		if (
			value.attempts !== undefined &&
			(!Array.isArray(value.attempts) ||
				value.attempts.length !== 4 ||
				value.attempts.some(
					(phase) =>
						!["not-started", "reserved", "complete", "failed"].includes(phase),
				))
		)
			throw new Error("Invalid cover attempt summary");
	}
}
