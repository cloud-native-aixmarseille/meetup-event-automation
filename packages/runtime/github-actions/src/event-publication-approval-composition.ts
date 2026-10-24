import { GithubOrganizerApprovalComposition } from "@meetup-automation/github-organizer-approval";
import { SlackNotificationGatewayComposition } from "@meetup-automation/slack-notification-gateway";
import type { EventCompositionInput } from "./composition.js";
import { OrganizerApprovalComposition } from "./organizer-approval-composition.js";
export class EventPublicationApprovalComposition {
	static create(
		input: EventCompositionInput & {
			issueNumber: number;
			commentAuthorLogin: string;
			slackToken: string;
			slackOrganizerChannelId: string;
		},
	) {
		return OrganizerApprovalComposition.create(
			new GithubOrganizerApprovalComposition().githubApprovalClient(
				input.client,
				input.owner,
				input.repo,
				input.issueNumber,
			),
			input.commentAuthorLogin,
			new GithubOrganizerApprovalComposition().approvalPresenter(
				new GithubOrganizerApprovalComposition().approvalMessages(input.locale),
			),
			new SlackNotificationGatewayComposition().slackApprovalNotification(
				input.slackToken,
				new SlackNotificationGatewayComposition().slackApprovalPresenter(
					input.locale,
				),
			),
			input.slackOrganizerChannelId,
		).approval;
	}
}
