import {
	MessageLocalizer,
	type MessageLocalizerCollaborators,
} from "@meetup-automation/localization";
import { CATALOGS, type MessageId } from "./catalog.js";
import type { MessageParameters } from "./message-parameters.js";
export class AttendeeMessages extends MessageLocalizer<
	MessageId,
	MessageParameters
> {
	constructor(collaborators: MessageLocalizerCollaborators, locale: string) {
		super(collaborators, CATALOGS, locale);
	}
}
