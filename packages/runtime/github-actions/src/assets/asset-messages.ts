import {
	MessageLocalizer,
	type MessageLocalizerCollaborators,
} from "@meetup-automation/localization";
import { CATALOGS, type MessageId } from "./catalog.js";
import type { MessageParameters } from "./message-parameters.js";

export class AssetMessages extends MessageLocalizer<
	MessageId,
	MessageParameters
> {
	constructor(collaborators: MessageLocalizerCollaborators, locale = "en") {
		super(collaborators, CATALOGS, locale);
	}
}
export type AssetMessagesArguments =
	ConstructorParameters<typeof AssetMessages> extends [unknown, ...infer Args]
		? Args
		: never;
