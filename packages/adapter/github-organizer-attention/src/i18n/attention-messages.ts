import {
	MessageLocalizer,
	type MessageLocalizerCollaborators,
} from "@meetup-automation/localization";
import { CATALOGS, type MessageId } from "./catalog.js";
export interface MessageParameters {
	"attention.redirect": { url: string };
	"action.manual-publication": { task: string };
	"action.integration-failure": { task: string };
	"action.follow-up": { task: string };
	"action.stage-unknown": { task: string };
}
export class AttentionMessages extends MessageLocalizer<
	MessageId,
	MessageParameters
> {
	constructor(collaborators: MessageLocalizerCollaborators, locale = "en") {
		super(collaborators, CATALOGS, locale);
	}
	failure(resource: string): string {
		const key = `failure.${resource}` as MessageId;
		return Object.hasOwn(CATALOGS.en, key)
			? this.t(key)
			: this.t("action.integration-failure", { task: this.task(resource) });
	}
	task(resource: string): string {
		const key = `task.${resource}` as MessageId;
		return this.t(Object.hasOwn(CATALOGS.en, key) ? key : "task.unknown");
	}
}
export type AttentionMessagesArguments =
	ConstructorParameters<typeof AttentionMessages> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
