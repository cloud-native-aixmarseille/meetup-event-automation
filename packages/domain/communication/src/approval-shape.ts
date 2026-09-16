import type { EventOccurrenceStatus, EventReadiness } from "./model.js";

export class ApprovalShape {
	static isOccurrenceStatus(value: unknown): value is EventOccurrenceStatus {
		return (
			typeof value === "string" &&
			["scheduled", "postponed", "held", "cancelled", "unknown"].includes(value)
		);
	}

	static isReadiness(value: unknown): value is EventReadiness {
		return value === "ready" || value === "not-ready";
	}

	static isNullableString(value: unknown): value is string | null {
		return value === null || typeof value === "string";
	}

	static isExactRecord(
		value: unknown,
		expectedKeys: readonly string[],
	): value is Record<string, unknown> {
		if (!value || typeof value !== "object" || Array.isArray(value)) {
			return false;
		}
		const keys = Object.keys(value).sort();
		const expected = [...expectedKeys].sort();
		return (
			keys.length === expected.length &&
			keys.every((key, index) => key === expected[index])
		);
	}
}
