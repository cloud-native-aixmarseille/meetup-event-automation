import {
	type CommunicationClock,
	LinkedInPostReference,
	ReconcileLinkedInSharing,
} from "@meetup-automation/communication";
import {
	type EventDocumentCodec,
	EventDocumentConcurrency,
	type EventRepository,
} from "@meetup-automation/event";
import { GithubOrganizerApprovalComposition } from "@meetup-automation/github-organizer-approval";
import { GithubSocialDeliveryJournalComposition } from "@meetup-automation/github-social-delivery-journal";
import { NotifyLinkedInSharing } from "@meetup-automation/journey";
import { SlackNotificationGatewayComposition } from "@meetup-automation/slack-notification-gateway";
import type { EventDocumentCompositionInput } from "./composition.js";

export class LinkedInSharingComposition {
	create(
		input: EventDocumentCompositionInput & {
			readonly issueNumber: number;
			readonly commentAuthorLogin: string;
			readonly slackToken: string;
			readonly slackOrganizerChannelId: string;
		},
		repository: EventRepository,
		codec: EventDocumentCodec,
		clock: CommunicationClock,
	): NotifyLinkedInSharing {
		const client =
			new GithubOrganizerApprovalComposition().githubApprovalClient(
				input.client,
				input.owner,
				input.repo,
				input.issueNumber,
			);
		const journals = new GithubSocialDeliveryJournalComposition();
		return new NotifyLinkedInSharing(
			repository,
			codec,
			new EventDocumentConcurrency(),
			journals.create(client, input.commentAuthorLogin),
			new ReconcileLinkedInSharing(
				new LinkedInPostReference(),
				journals.sharing(client, input.commentAuthorLogin),
				new SlackNotificationGatewayComposition().linkedinSharingNotification(
					input.slackToken,
					input.slackOrganizerChannelId,
					input.locale,
				),
				clock,
			),
		);
	}
}
