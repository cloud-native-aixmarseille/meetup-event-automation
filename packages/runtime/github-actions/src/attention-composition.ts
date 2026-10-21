import {
	type AttentionNotification,
	type AttentionRepository,
	ReconcileAttention,
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
	GithubFollowUpAttentionRepository,
} from "@meetup-automation/github-organizer-approval";
import {
	AttentionDiagnosticChecklist,
	AttentionMessages,
	AttentionPresenter,
	AttentionRecord,
	GithubAttentionClient,
	GithubAttentionRepository,
} from "@meetup-automation/github-organizer-attention";
import {
	type AutomationConfig,
	ManageMeetupAttention,
} from "@meetup-automation/journey";
import {
	SlackApprovalNotification,
	SlackApprovalPresenter,
	SlackAttentionNotification,
	SlackAttentionPresenter,
} from "@meetup-automation/slack-notification-gateway";
import { SystemCommunicationClock } from "@meetup-automation/system-clock";
import type { Container } from "inversify";
import {
	EventComposition,
	type EventDocumentCompositionInput,
	SERVICES,
} from "./composition.js";
import { OrganizerApprovalComposition } from "./organizer-approval-composition.js";
import { OrganizerFeedback } from "./organizer-feedback.js";

type ApprovalCapabilities = ReturnType<
	typeof OrganizerApprovalComposition.create
>;
const ATTENTION_SERVICES = {
	approvals: Symbol("OrganizerApprovalCapabilities"),
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
		AttentionComposition.bindFeedback(container);
		container
			.bind(SystemCommunicationClock)
			.toDynamicValue(() => new SystemCommunicationClock());
		container
			.bind<ApprovalCapabilities>(ATTENTION_SERVICES.approvals)
			.toDynamicValue(() => AttentionComposition.approvals(input))
			.inSingletonScope();
		const checklist = new AttentionDiagnosticChecklist();
		const presenter = new AttentionPresenter(
			`${input.owner}/${input.repo}`,
			input.issueNumber,
			checklist,
			new AttentionMessages(input.locale),
		);
		container
			.bind<AttentionRepository>(ATTENTION_SERVICES.repository)
			.toDynamicValue(
				(context) =>
					new GithubFollowUpAttentionRepository(
						context.get<ApprovalCapabilities>(ATTENTION_SERVICES.approvals)
							.followUp,
						new GithubAttentionRepository(
							new GithubAttentionClient(
								input.client,
								input.owner,
								input.repo,
								input.issueNumber,
							),
							input.commentAuthorLogin,
							presenter,
							checklist,
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
						new SlackAttentionPresenter(
							`${input.owner}/${input.repo}`,
							input.issueNumber,
							input.locale,
							checklist,
						),
					),
			);
		AttentionComposition.bindJourney(container, input);
		return container;
	}
	private static bindFeedback(container: Container): void {
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
	}
	private static approvals(
		input: AttentionCompositionInput,
	): ApprovalCapabilities {
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
				approvals: context.get<ApprovalCapabilities>(
					ATTENTION_SERVICES.approvals,
				).attention,
				followUp: context.get<ApprovalCapabilities>(
					ATTENTION_SERVICES.approvals,
				).followUp,
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
