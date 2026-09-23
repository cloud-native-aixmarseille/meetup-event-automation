import { createIntl, createIntlCache, type IntlShape } from "@formatjs/intl";
import type {
	Locale,
	MessageCatalogs,
	MessageValues,
} from "./message-catalogs.js";

type MessageArguments<Key, Parameters> = Key extends keyof Parameters
	? [parameters: Parameters[Key]]
	: [];

/** Formats an owner's catalog; no application messages or global language state. */
export class MessageLocalizer<
	Id extends string,
	Parameters extends Partial<Record<Id, MessageValues>> = Record<never, never>,
> {
	readonly locale: Locale;
	private readonly intl: IntlShape;

	constructor(
		private readonly catalogs: MessageCatalogs<Id>,
		locale = "en",
	) {
		this.locale = MessageLocalizer.resolveLocale(locale);
		this.intl = createIntl(
			{
				locale: this.locale,
				defaultLocale: "en",
				messages: catalogs[this.locale] as Readonly<Record<string, string>>,
				onError: MessageLocalizer.keepFormattingErrorsPrivate,
				onWarn: MessageLocalizer.keepFormattingErrorsPrivate,
			},
			createIntlCache(),
		);
	}

	static resolveLocale(requested: string): Locale {
		try {
			const language = new Intl.Locale(
				requested.trim().replaceAll("_", "-") || "en",
			).language;
			return language === "fr" ? "fr" : "en";
		} catch {
			return "en";
		}
	}

	t<Key extends Id>(
		key: Key,
		...args: MessageArguments<Key, Parameters>
	): string {
		return this.intl.formatMessage(
			{ id: key, defaultMessage: this.catalogs.en[key] },
			args[0],
			{ ignoreTag: true },
		);
	}

	private static keepFormattingErrorsPrivate(): void {
		// FormatJS still performs its normal fallback. Its default console handlers
		// may include interpolation values; public reporting belongs to the caller.
	}
}
