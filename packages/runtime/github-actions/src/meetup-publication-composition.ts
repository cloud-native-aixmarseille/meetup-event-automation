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
	GithubOrganizerApproval,
} from "@meetup-automation/github-organizer-approval";
import {
	SlackApprovalNotification,
	SlackApprovalPresenter,
} from "@meetup-automation/slack-notification-gateway";
import { GithubPublicationJournal } from "@meetup-automation/github-publication-journal";
import {
	type AutomationConfig,
	ManageMeetupEvent,
	ManageMeetupPublication,
	type MeetupPublicationSettings,
} from "@meetup-automation/journey";
import { MeetupEventGateway } from "@meetup-automation/meetup-event-gateway";
import {
	EventComposition,
	type EventCompositionInput,
	SERVICES,
} from "./composition.js";

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
					prefix.replace(/events\/$/, ""),
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
		return new GithubOrganizerApproval(
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
		);
	}
}
