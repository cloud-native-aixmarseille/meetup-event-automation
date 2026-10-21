import { fileURLToPath } from "node:url";
import type {
	EventClock,
	EventDocumentCodec,
	EventRepository,
} from "@meetup-automation/event";
import { GithubOrganizerApprovalComposition } from "@meetup-automation/github-organizer-approval";
import { GithubPublicationJournalComposition } from "@meetup-automation/github-publication-journal";
import {
	JourneyComposition,
	ManageMeetupEvent,
	ManageMeetupPublication,
	type MeetupPublicationSettings,
} from "@meetup-automation/journey";
import { MeetupEventGatewayComposition } from "@meetup-automation/meetup-event-gateway";
import { MeetupGroupUrl } from "@meetup-automation/publication";
import { SlackNotificationGatewayComposition } from "@meetup-automation/slack-notification-gateway";
import {
	EventComposition,
	type EventCompositionInput,
	SERVICES,
} from "./composition.js";
import { OrganizerApprovalComposition } from "./organizer-approval-composition.js";

export class MeetupPublicationComposition {
	static create(
		input: EventCompositionInput & {
			issueNumber: number;
			commentAuthorLogin: string;
			settings: MeetupPublicationSettings;
			email: string;
			password: string;
			geminiApiKey: string;
			geminiModel: string;
			slackToken: string;
			slackOrganizerChannelId: string;
		},
	) {
		const container = EventComposition.createEventContainer(input);
		container.bind(ManageMeetupPublication).toDynamicValue((context) => {
			const prefix = input.publicationUrls.meetupEventUrlPrefix;
			const group = MeetupGroupUrl.fromEventUrlPrefix(prefix);
			if (!group) throw new Error("Invalid Meetup event URL prefix");
			return new JourneyComposition().manageMeetupPublication({
				repository: context.get<EventRepository>(SERVICES.eventRepository),
				codec: context.get<EventDocumentCodec>(SERVICES.eventDocumentCodec),
				clock: context.get<EventClock>(SERVICES.eventClock),
				manageEvent: context.get(ManageMeetupEvent),
				settings: input.settings,
				approval: MeetupPublicationComposition.approval(input),
				meetupUrlPrefix: prefix,
				journal:
					new GithubPublicationJournalComposition().githubPublicationJournal(
						input.client,
						{
							owner: input.owner,
							repo: input.repo,
							issue_number: input.issueNumber,
						},
						input.commentAuthorLogin,
					),
				gateway: new MeetupEventGatewayComposition()
					.meetupEventGatewayFactory()
					.create(
						{ email: input.email, password: input.password },
						fileURLToPath(
							new URL(
								"../../../../packages/adapter/meetup-event-gateway/python/",
								import.meta.url,
							),
						),
						input.geminiApiKey,
						input.geminiModel,
						group.value,
					),
			});
		});
		return container;
	}
	private static approval(
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
