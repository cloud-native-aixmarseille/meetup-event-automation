import { fileURLToPath } from "node:url";
import type {
	EventClock,
	EventDocumentCodec,
	EventRepository,
} from "@meetup-automation/event";
import {
	ApprovalMessages,
	ApprovalPresenter,
	GithubApprovalClient,
} from "@meetup-automation/github-organizer-approval";
import { GithubPublicationJournal } from "@meetup-automation/github-publication-journal";
import {
	type AutomationConfig,
	ManageMeetupEvent,
	ManageMeetupPublication,
	type MeetupPublicationSettings,
} from "@meetup-automation/journey";
import { MeetupEventGateway } from "@meetup-automation/meetup-event-gateway";
import { MeetupGroupUrl } from "@meetup-automation/publication";
import {
	SlackApprovalNotification,
	SlackApprovalPresenter,
} from "@meetup-automation/slack-notification-gateway";
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
			const prefix = context.get<AutomationConfig>(SERVICES.config).publication[
				"meetup-event-url-prefix"
			];
			const group = MeetupGroupUrl.fromEventUrlPrefix(prefix);
			if (!group) throw new Error("Invalid Meetup event URL prefix");
			return new ManageMeetupPublication({
				repository: context.get<EventRepository>(SERVICES.eventRepository),
				codec: context.get<EventDocumentCodec>(SERVICES.eventDocumentCodec),
				clock: context.get<EventClock>(SERVICES.eventClock),
				manageEvent: context.get(ManageMeetupEvent),
				settings: input.settings,
				approval: MeetupPublicationComposition.approval(input),
				meetupUrlPrefix: prefix,
				journal: new GithubPublicationJournal(
					input.client,
					{
						owner: input.owner,
						repo: input.repo,
						issue_number: input.issueNumber,
					},
					input.commentAuthorLogin,
				),
				gateway: MeetupEventGateway.create(
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
			new GithubApprovalClient(
				input.client,
				input.owner,
				input.repo,
				input.issueNumber,
			),
			input.commentAuthorLogin,
			new ApprovalPresenter(new ApprovalMessages(input.locale)),
			new SlackApprovalNotification(
				input.slackToken,
				new SlackApprovalPresenter(input.locale),
			),
			input.slackOrganizerChannelId,
		).approval;
	}
}
