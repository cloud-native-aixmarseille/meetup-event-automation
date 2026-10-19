import { TemplateError } from "./template-error.js";

/** Render calendar-date patterns; event dates are not timezone-dependent instants. */
export class DateTemplateFormatter {
	constructor(private readonly locale: string) {}

	format(date: string, pattern: string): string {
		const instant = new Date(`${date}T00:00:00Z`);
		if (
			!/^\d{4}-\d{2}-\d{2}$/u.test(date) ||
			Number.isNaN(instant.valueOf()) ||
			instant.toISOString().slice(0, 10) !== date
		)
			throw new TemplateError("date");
		if (pattern === "long")
			return this.localized(instant, { dateStyle: "long" });
		if (pattern === "weekday")
			return this.localized(instant, { dateStyle: "full" });
		if (pattern === "month") return this.localized(instant, { month: "long" });
		const tokens = pattern.match(/Y+|M+|D+|d+|[ ./_-]+/gu) ?? [];
		if (
			tokens.join("") !== pattern ||
			!tokens.some((token) => /^[YMDd]/u.test(token))
		)
			throw new TemplateError("format");
		return tokens.map((token) => this.token(token, date, instant)).join("");
	}

	private token(token: string, date: string, instant: Date): string {
		switch (token) {
			case "YYYY":
				return date.slice(0, 4);
			case "YY":
				return date.slice(2, 4);
			case "MM":
				return date.slice(5, 7);
			case "M":
				return String(Number(date.slice(5, 7)));
			case "DD":
				return date.slice(8, 10);
			case "D":
				return String(Number(date.slice(8, 10)));
			case "MMM":
				return this.localized(instant, { month: "short" });
			case "MMMM":
				return this.localized(instant, { month: "long" });
			case "ddd":
				return this.localized(instant, { weekday: "short" });
			case "dddd":
				return this.localized(instant, { weekday: "long" });
			default:
				if (/^[ ./_-]+$/u.test(token)) return token;
				throw new TemplateError("format");
		}
	}

	private localized(
		instant: Date,
		options: Intl.DateTimeFormatOptions,
	): string {
		return new Intl.DateTimeFormat(this.locale, {
			...options,
			timeZone: "UTC",
			calendar: "gregory",
		}).format(instant);
	}
}
