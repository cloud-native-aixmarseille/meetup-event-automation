import { LocalizationComposition } from "@meetup-automation/localization";
import { GithubEventWebsite } from "./github-event-website.js";
import type {
	GithubWebsiteClient,
	GithubWebsiteTarget,
} from "./github-website-client.js";
import { WebsiteMessages } from "./i18n/website-messages.js";
import { WebsiteCalendarCodec } from "./website-calendar-codec.js";
import { WebsiteEventRow } from "./website-event-row.js";
export class GithubEventWebsiteComposition {
	create(
		createClient: () => GithubWebsiteClient,
		target: GithubWebsiteTarget,
		locale: string,
	): GithubEventWebsite {
		const messages = this.messages(locale);
		return new GithubEventWebsite(
			createClient,
			target,
			new WebsiteCalendarCodec(new WebsiteEventRow(messages)),
			messages,
		);
	}
	messages(locale: string): WebsiteMessages {
		return new WebsiteMessages(
			{ localeResolver: new LocalizationComposition().localeResolver() },
			locale,
		);
	}
}
