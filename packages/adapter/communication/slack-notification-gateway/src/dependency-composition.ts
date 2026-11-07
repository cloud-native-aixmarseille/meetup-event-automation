import {
	type AttentionChecklistSource,
	CommunicationDomainComposition,
} from "@meetup-automation/communication";
import { LocalizationComposition } from "@meetup-automation/localization";
import {
	SlackAttentionMessages,
	type SlackAttentionMessagesArguments,
} from "./attention-i18n/slack-attention-messages.js";
import { SlackApiClient } from "./slack-api-client.js";
import { SlackApprovalNotification } from "./slack-approval-notification.js";
import { SlackAttentionNotification } from "./slack-attention-notification.js";
import { SlackAttentionPresenter } from "./slack-attention-presenter.js";
import { SlackMessageReference } from "./slack-message-reference.js";
import type { SlackFetch } from "./slack-notification-gateway-contracts.js";
/** Assembles this package's collaborators; no business decisions or I/O. */
export class SlackNotificationGatewayComposition {
	slackApiClient(token: string, fetcher: SlackFetch = fetch): SlackApiClient {
		return new SlackApiClient(token, fetcher);
	}
	slackApprovalNotification(
		token: string,
		fetcher: SlackFetch = fetch,
	): SlackApprovalNotification {
		return new SlackApprovalNotification(
			{
				slackMessageReference: this.slackMessageReference(),
			},
			this.slackApiClient(token, fetcher),
		);
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
