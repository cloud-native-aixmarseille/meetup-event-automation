import type { Container } from "inversify";
import { SystemCommunicationClock } from "@meetup-automation/system-clock";
import {
	ReconcileAttention,
	type AttentionNotification,
	type AttentionRepository,
} from "@meetup-automation/communication";
import type {
	EventCommentRepository,
	EventDocumentCodec,
	EventRepository,
} from "@meetup-automation/event";
import {
	GithubDeliveryLedger,
	ScopedGithubLedgerCommentClient,
} from "@meetup-automation/github-delivery-ledger";
import {
	ApprovalMessages,
	ApprovalPresenter,
	GithubApprovalClient,
	GithubOrganizerApproval,
	GithubFollowUpAttentionRepository,
} from "@meetup-automation/github-organizer-approval";
import {
	AttentionMessages,
	AttentionRecord,
	AttentionPresenter,
	GithubAttentionClient,
	GithubAttentionRepository,
} from "@meetup-automation/github-organizer-attention";
import {
	ManageMeetupAttention,
	type AutomationConfig,
} from "@meetup-automation/journey";
import {
	SlackApprovalNotification,
	SlackApprovalPresenter,
	SlackAttentionNotification,
} from "@meetup-automation/slack-notification-gateway";
import {
	EventComposition,
	SERVICES,
	type EventDocumentCompositionInput,
} from "./composition.js";
import { OrganizerFeedback } from "./organizer-feedback.js";
const ATTENTION_SERVICES = {
	repository: Symbol("AttentionRepository"),
	notification: Symbol("AttentionNotification"),
};
type AttentionCompositionInput = EventDocumentCompositionInput & {
	commentAuthorLogin: string;
	issueNumber: number;
	slackToken: string;
	slackOrganizerChannelId: string;
};
export class AttentionComposition {
	static create(input: AttentionCompositionInput) {
		const container = EventComposition.createDocumentContainer({
			...input,
			retireCommunicationReports: true,
		});
		container
			.bind(OrganizerFeedback)
			.toDynamicValue(
				(context) =>
					new OrganizerFeedback(
						context.get<EventRepository>(SERVICES.eventRepository),
						context.get<EventCommentRepository>(
							SERVICES.eventCommentRepository,
						),
						context.get<AutomationConfig>(SERVICES.config).event["issue-label"],
					),
			);
		container
			.bind(SystemCommunicationClock)
			.toDynamicValue(() => new SystemCommunicationClock());
		container
			.bind(GithubOrganizerApproval)
			.toDynamicValue(() => AttentionComposition.approvals(input))
			.inSingletonScope();
		const presenter = new AttentionPresenter(
			`${input.owner}/${input.repo}`,
			input.issueNumber,
			new AttentionMessages(input.locale),
		);
		container
			.bind<AttentionRepository>(ATTENTION_SERVICES.repository)
			.toDynamicValue(
				(context) =>
					new GithubFollowUpAttentionRepository(
						context.get(GithubOrganizerApproval),
						new GithubAttentionRepository(
							new GithubAttentionClient(
								input.client,
								input.owner,
								input.repo,
								input.issueNumber,
							),
							input.commentAuthorLogin,
							presenter,
						),
						AttentionRecord,
						presenter,
					),
			);
		container
			.bind<AttentionNotification>(ATTENTION_SERVICES.notification)
			.toDynamicValue(
				() =>
					new SlackAttentionNotification(
						input.slackToken,
						input.slackOrganizerChannelId,
						presenter,
					),
			);
		AttentionComposition.bindJourney(container, input);
		return container;
	}
	private static approvals(
		input: AttentionCompositionInput,
	): GithubOrganizerApproval {
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
	private static bindJourney(
		container: Container,
		input: AttentionCompositionInput,
	): void {
		container.bind(ManageMeetupAttention).toDynamicValue((context) => {
			const clock = context.get(SystemCommunicationClock);
			return new ManageMeetupAttention({
				config: context.get<AutomationConfig>(SERVICES.config),
				repository: context.get<EventRepository>(SERVICES.eventRepository),
				codec: context.get<EventDocumentCodec>(SERVICES.eventDocumentCodec),
				clock,
				approvals: context.get(GithubOrganizerApproval),
				followUp: context.get(GithubOrganizerApproval),
				recovery: new GithubDeliveryLedger(
					new ScopedGithubLedgerCommentClient(
						input.client,
						input.owner,
						input.repo,
						input.issueNumber,
					),
					{ dispatchAuthorized: false, authorLogin: input.commentAuthorLogin },
				),
				reconciliation: new ReconcileAttention(
					context.get<AttentionRepository>(ATTENTION_SERVICES.repository),
					context.get<AttentionNotification>(ATTENTION_SERVICES.notification),
					clock,
				),
			});
		});
	}
}
