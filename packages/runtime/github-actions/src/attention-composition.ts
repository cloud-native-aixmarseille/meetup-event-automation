import {
	type AttentionNotification,
	type AttentionRepository,
	CommunicationDomainComposition,
} from "@meetup-automation/communication";
import type {
	EventCommentRepository,
	EventDocumentCodec,
	EventRepository,
} from "@meetup-automation/event";
import { GithubDeliveryLedgerComposition } from "@meetup-automation/github-delivery-ledger";
import { GithubOrganizerApprovalComposition } from "@meetup-automation/github-organizer-approval";
import type { AttentionDiagnosticChecklist } from "@meetup-automation/github-organizer-attention";
import { GithubOrganizerAttentionComposition } from "@meetup-automation/github-organizer-attention";
import {
	type AutomationConfig,
	JourneyComposition,
	ManageMeetupAttention,
} from "@meetup-automation/journey";
import type { PublicationUrlConfiguration } from "@meetup-automation/publication";
import { SlackNotificationGatewayComposition } from "@meetup-automation/slack-notification-gateway";
import {
	SystemClockComposition,
	SystemCommunicationClock,
} from "@meetup-automation/system-clock";
import type { Container } from "inversify";
import {
	EventComposition,
	type EventDocumentCompositionInput,
	SERVICES,
} from "./composition.js";
import { GithubActionsComposition } from "./dependency-composition.js";
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
	publicationUrls: PublicationUrlConfiguration;
	commentAuthorLogin: string;
	issueNumber: number;
	slackToken: string;
	slackOrganizerChannelId: string;
};
export class AttentionComposition {
	static create(input: AttentionCompositionInput) {
		new GithubActionsComposition()
			.publicationUrlInput()
			.validate(input.publicationUrls);
		const container = EventComposition.createDocumentContainer({
			...input,
			retireCommunicationReports: true,
		});
		AttentionComposition.bindFeedback(container);
		container
			.bind(SystemCommunicationClock)
			.toDynamicValue(() =>
				new SystemClockComposition().systemCommunicationClock(),
			);
		container
			.bind<ApprovalCapabilities>(ATTENTION_SERVICES.approvals)
			.toDynamicValue(() => AttentionComposition.approvals(input))
			.inSingletonScope();
		const checklist =
			new GithubOrganizerAttentionComposition().attentionDiagnosticChecklist();
		const presenter =
			new GithubOrganizerAttentionComposition().attentionPresenter(
				`${input.owner}/${input.repo}`,
				input.issueNumber,
				checklist,
				new GithubOrganizerAttentionComposition().attentionMessages(
					input.locale,
				),
			);
		container
			.bind<AttentionRepository>(ATTENTION_SERVICES.repository)
			.toDynamicValue((context) =>
				new GithubOrganizerApprovalComposition().githubFollowUpAttentionRepository(
					context.get<ApprovalCapabilities>(ATTENTION_SERVICES.approvals)
						.followUp,
					new GithubOrganizerAttentionComposition().githubAttentionRepository(
						new GithubOrganizerAttentionComposition().githubAttentionClient(
							input.client,
							input.owner,
							input.repo,
							input.issueNumber,
						),
						input.commentAuthorLogin,
						presenter,
						checklist,
					),
					new GithubOrganizerAttentionComposition().attentionRecord(),
					presenter,
				),
			);
		AttentionComposition.bindNotification(container, input, checklist);
		AttentionComposition.bindJourney(container, input);
		return container;
	}
	private static bindNotification(
		container: Container,
		input: AttentionCompositionInput,
		checklist: AttentionDiagnosticChecklist,
	): void {
		container
			.bind<AttentionNotification>(ATTENTION_SERVICES.notification)
			.toDynamicValue(() =>
				new SlackNotificationGatewayComposition().slackAttentionNotification(
					input.slackToken,
					input.slackOrganizerChannelId,
					new SlackNotificationGatewayComposition().slackAttentionPresenter(
						`${input.owner}/${input.repo}`,
						input.issueNumber,
						input.locale,
						checklist,
					),
				),
			);
	}

	private static bindFeedback(container: Container): void {
		container
			.bind(OrganizerFeedback)
			.toDynamicValue((context) =>
				new GithubActionsComposition().organizerFeedback(
					context.get<EventRepository>(SERVICES.eventRepository),
					context.get<EventCommentRepository>(SERVICES.eventCommentRepository),
					context.get<AutomationConfig>(SERVICES.config).event["issue-label"],
				),
			);
	}
	private static approvals(
		input: AttentionCompositionInput,
	): ApprovalCapabilities {
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
		);
	}
	private static bindJourney(
		container: Container,
		input: AttentionCompositionInput,
	): void {
		container.bind(ManageMeetupAttention).toDynamicValue((context) => {
			const clock = context.get(SystemCommunicationClock);
			return new JourneyComposition().manageMeetupAttention({
				publicationUrls: input.publicationUrls,
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
				recovery: new GithubDeliveryLedgerComposition().githubDeliveryLedger(
					new GithubDeliveryLedgerComposition().scopedGithubLedgerCommentClient(
						input.client,
						input.owner,
						input.repo,
						input.issueNumber,
					),
					{ dispatchAuthorized: false, authorLogin: input.commentAuthorLogin },
					new GithubDeliveryLedgerComposition().ledgerCommentPresenter(
						new GithubDeliveryLedgerComposition().ledgerMessages(input.locale),
					),
				),
				reconciliation: new CommunicationDomainComposition().reconcileAttention(
					context.get<AttentionRepository>(ATTENTION_SERVICES.repository),
					context.get<AttentionNotification>(ATTENTION_SERVICES.notification),
					clock,
				),
			});
		});
	}
}
