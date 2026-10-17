export class AssetDateFormatter {
	constructor(private readonly locale: string) {}

	format(
		date: string | undefined,
		timeZone: string,
		format: "long" | "month" | "numeric" | "weekday" = "long",
	): string | undefined {
		if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
		try {
			new Intl.DateTimeFormat(this.locale, { timeZone });
			const instant = new Date(`${date}T00:00:00Z`);
			if (instant.toISOString().slice(0, 10) !== date) return undefined;
			if (format === "numeric")
				return `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
			const options: Intl.DateTimeFormatOptions =
				format === "month"
					? { month: "long" }
					: { dateStyle: format === "weekday" ? "full" : "long" };
			return new Intl.DateTimeFormat(this.locale, {
				...options,
				timeZone: "UTC",
			}).format(instant);
		} catch {
			return undefined;
		}
	}
}
