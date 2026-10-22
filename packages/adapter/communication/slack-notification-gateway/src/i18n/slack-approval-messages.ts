import {
	MessageLocalizer,
	type MessageLocalizerCollaborators,
} from "@meetup-automation/localization";
import { CATALOGS, type MessageId } from "./catalog.js";
import type { MessageParameters } from "./message-parameters.js";

export class SlackApprovalMessages extends MessageLocalizer<
	MessageId,
	MessageParameters
> {
	constructor(
		collaborators: MessageLocalizerCollaborators,
		locale: string | undefined,
	) {
		super(collaborators, CATALOGS, locale);
	}
}
export type SlackApprovalMessagesArguments =
	ConstructorParameters<typeof SlackApprovalMessages> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
