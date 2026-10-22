import {
	MessageLocalizer,
	type MessageLocalizerCollaborators,
} from "@meetup-automation/localization";
import { CATALOGS, type MessageId } from "./catalog.js";
export class IssueFormMessages extends MessageLocalizer<MessageId> {
	constructor(collaborators: MessageLocalizerCollaborators, locale = "en") {
		super(collaborators, CATALOGS, locale);
	}
}
export type IssueFormMessagesArguments =
	ConstructorParameters<typeof IssueFormMessages> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
