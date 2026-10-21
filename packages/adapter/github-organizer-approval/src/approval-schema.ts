/** Structural fields shared by the versioned approval comment schema. */
export class ApprovalSchema {
	static object(value: unknown): value is Record<string, unknown> {
		return typeof value === "object" && value !== null && !Array.isArray(value);
	}

	static count(value: unknown): value is number {
		return (
			typeof value === "number" && Number.isSafeInteger(value) && value >= 0
		);
	}

	static text(value: unknown, maximum: number): value is string {
		return (
			typeof value === "string" &&
			value.length <= maximum &&
			!/[\r\n\0]/.test(value)
		);
	}
}
