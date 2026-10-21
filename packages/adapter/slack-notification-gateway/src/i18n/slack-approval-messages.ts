import { MessageLocalizer } from "@meetup-automation/localization";
import { CATALOGS, type MessageId } from "./catalog.js";
import type { MessageParameters } from "./message-parameters.js";

export class SlackApprovalMessages extends MessageLocalizer<
	MessageId,
	MessageParameters
> {
	constructor(locale: string | undefined) {
		super(CATALOGS, locale);
	}
}
