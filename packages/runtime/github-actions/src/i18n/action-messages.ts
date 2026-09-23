import { MessageLocalizer } from "@meetup-automation/localization";
import { CATALOGS, type MessageId } from "./catalog.js";
import type { MessageParameters } from "./message-parameters.js";
export class ActionMessages extends MessageLocalizer<
	MessageId,
	MessageParameters
> {
	constructor(locale = "en") {
		super(CATALOGS, locale);
	}
	/** The fallback must already be redacted by the public diagnostic boundary. */
	diagnostic(code: string, fallback: string): string {
		const key = `diagnostic.${code}` as Extract<
			MessageId,
			`diagnostic.${string}`
		>;
		return this.locale === "en" || !Object.hasOwn(CATALOGS.en, key)
			? fallback
			: this.t(key);
	}

	error(name: string, publicFallback: string): string {
		const key = `error.${name}` as Extract<MessageId, `error.${string}`>;
		if (this.locale === "en") return publicFallback;
		return Object.hasOwn(CATALOGS.en, key)
			? this.t(key)
			: this.t("report.error.unexpected");
	}
}
