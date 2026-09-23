import { MessageLocalizer } from "@meetup-automation/localization";
import { CATALOGS, type MessageId } from "./catalog.js";
export class IssueFormMessages extends MessageLocalizer<MessageId> {
	constructor(locale = "en") {
		super(CATALOGS, locale);
	}
}
