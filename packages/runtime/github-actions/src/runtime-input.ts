export class RuntimeInput {
	positiveIntegerInput(name: string, value: string): number {
		if (!/^\d+$/.test(value)) {
			throw new Error(`${name} must be a positive integer`);
		}
		const parsed = Number(value);
		if (!Number.isSafeInteger(parsed) || parsed <= 0) {
			throw new Error(`${name} must be a positive integer`);
		}
		return parsed;
	}

	enumInput<const T extends string>(
		name: string,
		value: string,
		allowed: readonly T[],
	): T {
		const parsed = allowed.find((candidate) => candidate === value);
		if (parsed === undefined) {
			throw new Error(`${name} must be one of: ${allowed.join(", ")}`);
		}
		return parsed;
	}

	isObject(value: unknown): value is Record<string, unknown> {
		return value !== null && typeof value === "object" && !Array.isArray(value);
	}

	booleanInput(name: string, value: string): boolean {
		if (value === "true") return true;
		if (value === "false") return false;
		throw new Error(`${name} must be true or false`);
	}
}
