import {
	MessageLocalizer,
	type MessageLocalizerCollaborators,
} from "@meetup-automation/localization";
import { CATALOGS, type MessageId } from "./catalog.js";
import type { MessageParameters } from "./message-parameters.js";
export class ActionMessages extends MessageLocalizer<
	MessageId,
	MessageParameters
> {
	constructor(collaborators: MessageLocalizerCollaborators, locale = "en") {
		super(collaborators, CATALOGS, locale);
	}
	/** Private speaker-sync PR guidance; the fallback must already be redacted. */
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
export type ActionMessagesArguments =
	ConstructorParameters<typeof ActionMessages> extends [unknown, ...infer Args]
		? Args
		: never;
