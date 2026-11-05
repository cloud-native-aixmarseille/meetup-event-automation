import {
	MessageLocalizer,
	type MessageLocalizerCollaborators,
} from "@meetup-automation/localization";
import { CATALOGS, type MessageId } from "./catalog.js";
export class StateMessages extends MessageLocalizer<MessageId> {
	constructor(
		collaborators: MessageLocalizerCollaborators,
		locale: string | undefined,
	) {
		super(collaborators, CATALOGS, locale);
	}
}
