/** Public template values organizers may override without changing recipients. */
export type EmailReviewParameters = Readonly<Record<string, string>>;

export class EmailReviewParameterPolicy {
	project(values: Readonly<Record<string, unknown>>): EmailReviewParameters {
		return Object.fromEntries(
			Object.entries(values).filter(
				([key, value]) => this.allowed(key) && typeof value === "string",
			),
		) as EmailReviewParameters;
	}

	validate(values: unknown): asserts values is EmailReviewParameters {
		if (!values || typeof values !== "object" || Array.isArray(values))
			throw new Error("Invalid email review parameters");
		for (const [key, value] of Object.entries(values)) {
			if (
				!this.allowed(key) ||
				typeof value !== "string" ||
				!this.valid(key, value)
			)
				throw new Error("Invalid email review parameter");
		}
	}

	validateEdit(
		original: EmailReviewParameters,
		edited: unknown,
	): asserts edited is EmailReviewParameters {
		this.validate(edited);
		const keys = Object.keys(original);
		if (
			keys.length !== Object.keys(edited).length ||
			keys.some((key) => !(key in edited))
		)
			throw new Error("Email review parameter keys cannot change");
	}

	private allowed(key: string): boolean {
		return [
			"eventDate",
			"eventMeetupUrl",
			"eventCncfUrl",
			"eventSlidesUrl",
		].includes(key);
	}

	private valid(key: string, value: string): boolean {
		if (!value || value.length > 2048 || /[\s`<>]/.test(value)) return false;
		if (key === "eventDate") {
			const date = new Date(`${value}T12:00:00Z`);
			return (
				/^\d{4}-\d{2}-\d{2}$/.test(value) &&
				Number.isFinite(date.getTime()) &&
				date.toISOString().slice(0, 10) === value
			);
		}
		try {
			const url = new URL(value);
			return url.protocol === "https:" && !url.username && !url.password;
		} catch {
			return false;
		}
	}
}
