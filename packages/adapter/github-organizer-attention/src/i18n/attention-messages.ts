import { MessageLocalizer } from "@meetup-automation/localization";
import { CATALOGS, type MessageId } from "./catalog.js";
export interface MessageParameters {
	"attention.redirect": { url: string };
	"slack.title": { issue: string };
	"slack.more": { count: number };
	"action.manual-publication": { task: string };
	"action.integration-failure": { task: string };
	"action.follow-up": { task: string };
	"action.stage-unknown": { task: string };
}
export class AttentionMessages extends MessageLocalizer<
	MessageId,
	MessageParameters
> {
	constructor(locale = "en") {
		super(CATALOGS, locale);
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
