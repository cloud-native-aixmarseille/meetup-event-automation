import {
	type AttentionChecklistSource,
	CommunicationDomainComposition,
} from "@meetup-automation/communication";
import { LocalizationComposition } from "@meetup-automation/localization";
import {
	SlackAttentionMessages,
	type SlackAttentionMessagesArguments,
} from "./attention-i18n/slack-attention-messages.js";
import {
	SlackApprovalMessages,
	type SlackApprovalMessagesArguments,
} from "./i18n/slack-approval-messages.js";
import { SlackApiClient } from "./slack-api-client.js";
import { SlackApprovalNotification } from "./slack-approval-notification.js";
import { SlackApprovalPresenter } from "./slack-approval-presenter.js";
import { SlackAttentionNotification } from "./slack-attention-notification.js";
import { SlackAttentionPresenter } from "./slack-attention-presenter.js";
import { SlackEmailApprovalPresenter } from "./slack-email-approval-presenter.js";
import { SlackMeetupApprovalPresenter } from "./slack-meetup-approval-presenter.js";
import { SlackMessageReference } from "./slack-message-reference.js";
import type { SlackFetch } from "./slack-notification-gateway-contracts.js";
/** Assembles this package's collaborators; no business decisions or I/O. */
export class SlackNotificationGatewayComposition {
	slackApiClient(token: string, fetcher: SlackFetch = fetch): SlackApiClient {
		return new SlackApiClient(token, fetcher);
	}
	slackApprovalMessages(
		...args: SlackApprovalMessagesArguments
	): SlackApprovalMessages {
		return new SlackApprovalMessages(
			{ localeResolver: new LocalizationComposition().localeResolver() },
			...args,
		);
	}
	slackApprovalNotification(
		token: string,
		presenter: Pick<SlackApprovalPresenter, "render">,
		fetcher: SlackFetch = fetch,
	): SlackApprovalNotification {
		return new SlackApprovalNotification(
			{
				slackMessageReference: this.slackMessageReference(),
			},
			this.slackApiClient(token, fetcher),
			presenter,
		);
	}
	slackApprovalPresenter(locale: string | undefined): SlackApprovalPresenter {
		const messages = this.slackApprovalMessages(locale);
		return new SlackApprovalPresenter({
			"email-introduction": new SlackEmailApprovalPresenter(messages),
			"meetup-publication": new SlackMeetupApprovalPresenter(messages),
		});
	}
	slackAttentionMessages(
		...args: SlackAttentionMessagesArguments
	): SlackAttentionMessages {
		return new SlackAttentionMessages(
			{ localeResolver: new LocalizationComposition().localeResolver() },
			...args,
		);
	}
	slackAttentionNotification(
		token: string,
		channel: string,
		presenter: Pick<SlackAttentionPresenter, "render">,
		fetcher: SlackFetch = fetch,
	): SlackAttentionNotification {
		return new SlackAttentionNotification(
			{
				slackMessageReference: this.slackMessageReference(),
			},
			this.slackApiClient(token, fetcher),
			channel,
			presenter,
		);
	}
	slackAttentionPresenter(
		repository: string,
		issueNumber: number,
		locale: string | undefined,
		checklist: AttentionChecklistSource,
	): SlackAttentionPresenter {
		return new SlackAttentionPresenter(
			{
				attentionTaskSelection:
					new CommunicationDomainComposition().attentionTaskSelection(),
				attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
			},
			repository,
			issueNumber,
			this.slackAttentionMessages(locale),
			checklist,
		);
	}
	slackMessageReference(): SlackMessageReference {
		return new SlackMessageReference();
	}
}
