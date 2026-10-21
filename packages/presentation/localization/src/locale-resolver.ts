import type { Locale } from "./message-catalogs.js";

export class LocaleResolver {
	resolveLocale(requested: string): Locale {
		try {
			const language = new Intl.Locale(
				requested.trim().replaceAll("_", "-") || "en",
			).language;
			return language === "fr" ? "fr" : "en";
		} catch {
			return "en";
		}
	}
}
