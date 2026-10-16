import { MessageLocalizer } from "@meetup-automation/localization";
import { CATALOGS, type MessageId } from "./catalog.js";
export interface MessageParameters {
	"attention.redirect": { url: string };
	"slack.title": { issue: string };
	"slack.more": { count: number };
	"slack.manual-publication": { task: string };
	"slack.integration-failure": { task: string };
	"slack.follow-up": { task: string };
	"slack.stage-unknown": { task: string };
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
