import { MAIL_TEMPLATE_NAMES } from "@meetup-automation/communication";
import type {
	ApprovalEmailDetail,
	EmailReviewParameters,
} from "@meetup-automation/journey";
import type { ApprovalSchema } from "./approval-schema.js";

/** Validate the complete mail values persisted in a trusted review snapshot. */
export class EmailApprovalMessageSchema {
	constructor(private readonly schema: Pick<ApprovalSchema, "object">) {}

	valid(value: unknown): value is NonNullable<ApprovalEmailDetail["message"]> {
		if (!this.schema.object(value)) return false;
		return (
			Object.keys(value).length === 5 &&
			typeof value.recipientEmail === "string" &&
			/^[^\s@]+@[^\s@]+$/.test(value.recipientEmail) &&
			Object.values(MAIL_TEMPLATE_NAMES).some(
				(name) => name === value.templateName,
			) &&
			typeof value.idempotencyKey === "string" &&
			value.idempotencyKey.length > 0 &&
			this.schema.object(value.placeholders) &&
			Object.values(value.placeholders).every((item) =>
				this.placeholder(item),
			) &&
			Array.isArray(value.parameterKeys) &&
			value.parameterKeys.every((key) => typeof key === "string") &&
			new Set(value.parameterKeys).size === value.parameterKeys.length
		);
	}

	validateParameters(
		message: ApprovalEmailDetail["message"],
		parameters: EmailReviewParameters | undefined,
	): void {
		if (
			message?.parameterKeys.some(
				(key) =>
					parameters?.[key] === undefined ||
					message.placeholders[key] !== parameters[key],
			)
		)
			throw new Error("Invalid email message parameters");
	}

	private placeholder(value: unknown): boolean {
		return (
			typeof value === "string" ||
			(Array.isArray(value) &&
				value.every(
					(item) =>
						this.schema.object(item) &&
						Object.keys(item).length === 2 &&
						typeof item.title === "string" &&
						typeof item.url === "string",
				))
		);
	}
}
