import { CommunicationDomainComposition } from "@meetup-automation/communication";
import { LocalizationComposition } from "@meetup-automation/localization";
import {
	SlackAttentionMessages,
	type SlackAttentionMessagesArguments,
} from "./attention-i18n/slack-attention-messages.js";
import {
	SlackApprovalMessages,
	type SlackApprovalMessagesArguments,
} from "./i18n/slack-approval-messages.js";
import {
	SlackApiClient,
	type SlackApiClientArguments,
} from "./slack-api-client.js";
import {
	SlackApprovalNotification,
	type SlackApprovalNotificationArguments,
} from "./slack-approval-notification.js";
import {
	SlackApprovalPresenter,
	type SlackApprovalPresenterArguments,
} from "./slack-approval-presenter.js";
import {
	SlackAttentionNotification,
	type SlackAttentionNotificationArguments,
} from "./slack-attention-notification.js";
import {
	SlackAttentionPresenter,
	type SlackAttentionPresenterArguments,
} from "./slack-attention-presenter.js";
import { SlackMessageReference } from "./slack-message-reference.js";
/** Assembles this package's collaborators; no business decisions or I/O. */
export class SlackNotificationGatewayComposition {
	slackApiClient(...args: SlackApiClientArguments): SlackApiClient {
		return new SlackApiClient(...args);
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
		...args: SlackApprovalNotificationArguments
	): SlackApprovalNotification {
		return new SlackApprovalNotification(
			{
				slackMessageReference: this.slackMessageReference(),
				createSlackApiClient: (...args) => this.slackApiClient(...args),
			},
			...args,
		);
	}
	slackApprovalPresenter(
		...args: SlackApprovalPresenterArguments
	): SlackApprovalPresenter {
		return new SlackApprovalPresenter(
			{
				createSlackApprovalMessages: (...args) =>
					this.slackApprovalMessages(...args),
			},
			...args,
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
		...args: SlackAttentionNotificationArguments
	): SlackAttentionNotification {
		return new SlackAttentionNotification(
			{
				slackMessageReference: this.slackMessageReference(),
				createSlackApiClient: (...args) => this.slackApiClient(...args),
			},
			...args,
		);
	}
	slackAttentionPresenter(
		...args: SlackAttentionPresenterArguments
	): SlackAttentionPresenter {
		return new SlackAttentionPresenter(
			{
				attentionTaskSelection:
					new CommunicationDomainComposition().attentionTaskSelection(),
				attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
				createSlackAttentionMessages: (...args) =>
					this.slackAttentionMessages(...args),
			},
			...args,
		);
	}
	slackMessageReference(): SlackMessageReference {
		return new SlackMessageReference();
	}
}
