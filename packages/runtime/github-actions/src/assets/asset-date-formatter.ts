import type { DateTemplateFormatter } from "@meetup-automation/templating";

export class AssetDateFormatter {
	constructor(
		private readonly dates: Pick<DateTemplateFormatter, "format">,
		private readonly locale: string,
	) {}

	format(
		date: string | undefined,
		timeZone: string,
		format: "long" | "month" | "numeric" | "weekday" = "long",
	): string | undefined {
		if (!date) return undefined;
		try {
			new Intl.DateTimeFormat(this.locale, { timeZone });
			return this.dates.format(
				date,
				format === "numeric" ? "DD/MM/YYYY" : format,
			);
		} catch {
			return undefined;
		}
	}
}
export type AssetDateFormatterArguments = [locale: string];
