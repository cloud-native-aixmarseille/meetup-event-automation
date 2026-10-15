import { MessageLocalizer } from "@meetup-automation/localization";
import { CATALOGS, type MessageId } from "./catalog.js";
export interface MessageParameters {
	"attention.date": { date: string };
	"attention.resolved": { count: number };
	"attention.manual-publication": { task: string };
	"attention.integration-failure": { task: string };
	"attention.follow-up": { task: string };
	"attention.stage-unknown": { task: string };
}
export class AttentionMessages extends MessageLocalizer<
	MessageId,
	MessageParameters
> {
	constructor(locale = "en") {
		super(CATALOGS, locale);
	}
	task(resource: string): string {
		const key = `task.${resource}` as MessageId;
		return this.t(Object.hasOwn(CATALOGS.en, key) ? key : "task.unknown");
	}
}
