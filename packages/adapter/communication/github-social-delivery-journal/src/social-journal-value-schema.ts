/** Closed public-state values: unknown fields never reach delivery history. */
export class SocialJournalValueSchema {
	object(value: unknown, keys: readonly string[]): Record<string, unknown> {
		if (
			!value ||
			typeof value !== "object" ||
			Array.isArray(value) ||
			Object.keys(value).some((key) => !keys.includes(key))
		)
			throw new Error("Invalid social delivery object");
		return value as Record<string, unknown>;
	}

	text(value: unknown, max: number): string {
		if (
			typeof value !== "string" ||
			!value.trim() ||
			value.length > max ||
			[...value].some(
				(character) =>
					character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
			)
		)
			throw new Error("Invalid social delivery value");
		return value;
	}

	pattern(value: unknown, max: number, pattern: RegExp): string {
		const text = this.text(value, max);
		if (!pattern.test(text))
			throw new Error("Invalid social delivery identity");
		return text;
	}

	instant(value: unknown): string {
		const text = this.text(value, 40);
		if (
			!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(text) ||
			!Number.isFinite(Date.parse(text))
		)
			throw new Error("Invalid social delivery timestamp");
		return text;
	}

	url(value: unknown, provider: "slack" | "linkedin"): string {
		const text = this.text(value, 2000);
		const url = new URL(text);
		const validHost =
			provider === "slack"
				? /^(?:[a-z0-9-]+\.)?slack\.com$/.test(url.hostname)
				: /^(?:www\.)?linkedin\.com$/.test(url.hostname);
		if (
			!validHost ||
			url.protocol !== "https:" ||
			url.username ||
			url.password ||
			url.search ||
			url.hash ||
			url.port
		)
			throw new Error("Invalid social delivery post URL");
		return text;
	}
}
