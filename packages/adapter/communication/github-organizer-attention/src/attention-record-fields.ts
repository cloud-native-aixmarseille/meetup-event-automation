/** Structural narrowing for the attention comment's JSON representation. */
export class AttentionRecordFields {
	record(value: unknown): Record<string, unknown> {
		if (typeof value !== "object" || value === null || Array.isArray(value))
			throw new Error("Invalid attention record object");
		return value as Record<string, unknown>;
	}
	text(value: unknown, pattern: RegExp): string {
		if (typeof value !== "string" || !pattern.test(value))
			throw new Error("Invalid attention record text");
		return value;
	}
	integer(value: unknown, positive = false): number {
		if (
			typeof value !== "number" ||
			!Number.isSafeInteger(value) ||
			(positive && value <= 0)
		)
			throw new Error("Invalid attention record integer");
		return value;
	}
	choice<const Values extends readonly (string | boolean | number)[]>(
		value: unknown,
		values: Values,
	): Values[number] {
		const found = values.find((candidate) => candidate === value);
		if (found === undefined)
			throw new Error("Invalid attention record variant");
		return found;
	}
	instant(value: unknown): string {
		const text = this.text(value, /^\d{4}-\d{2}-\d{2}T/);
		if (!Number.isFinite(Date.parse(text)))
			throw new Error("Invalid attention record timestamp");
		return text;
	}
}
