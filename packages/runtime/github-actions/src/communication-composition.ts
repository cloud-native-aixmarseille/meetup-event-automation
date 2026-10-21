import { getOctokit } from "@actions/github";
import {
	type DeliveryLedger,
	type MailGateway,
	type NotificationGateway,
	PlanCommunications,
	ReconcileCommunications,
} from "@meetup-automation/communication";
import type {
	EventDocumentCodec,
	EventRepository,
} from "@meetup-automation/event";
import {
	GithubDeliveryLedger,
	LedgerCommentPresenter,
	LedgerMessages,
	ScopedGithubLedgerCommentClient,
} from "@meetup-automation/github-delivery-ledger";
import {
	ApprovalMessages,
	ApprovalPresenter,
	GithubApprovalClient,
	GithubOrganizerApproval,
} from "@meetup-automation/github-organizer-approval";
import { GithubRepositoryDispatchMailGateway } from "@meetup-automation/github-repository-dispatch-mail-gateway";
import {
	type AutomationConfig,
	ManageMeetupCommunications,
	ManageMeetupEvent,
} from "@meetup-automation/journey";
import { OpenFeedbackTalkResultsGateway } from "@meetup-automation/openfeedback-event-gateway";
import type { ReferentialRepository } from "@meetup-automation/referential";
import {
	SlackApprovalNotification,
	SlackApprovalPresenter,
	SlackNotificationGateway,
} from "@meetup-automation/slack-notification-gateway";
import { SystemCommunicationClock } from "@meetup-automation/system-clock";
import type { Container } from "inversify";
import {
	EventComposition,
	type EventCompositionInput,
	SERVICES,
} from "./composition.js";

const COMMUNICATION_SERVICES = {
	mailGateway: Symbol("MailGateway"),
	notificationGateway: Symbol("NotificationGateway"),
	ledgerFactory: Symbol("DeliveryLedgerFactory"),
};

type CommunicationCompositionInput = EventCompositionInput & {
	readonly commentAuthorLogin: string;
	readonly issueNumber: number;
	readonly mailingsToken: string;
	readonly openFeedbackApiKey?: string;
	readonly slackToken: string;
	readonly slackOrganizerChannelId: string;
};

type DeliveryLedgerFactory = (dispatchAuthorized: boolean) => DeliveryLedger;

export class CommunicationComposition {
	static createCommunicationContainer(input: CommunicationCompositionInput) {
		const container = EventComposition.createEventContainer(input);
		CommunicationComposition.bindRepositories(container);
		CommunicationComposition.bindGateways(container, input);
		container
			.bind<DeliveryLedgerFactory>(COMMUNICATION_SERVICES.ledgerFactory)
			.toDynamicValue(
				() => (dispatchAuthorized) =>
					new GithubDeliveryLedger(
						new ScopedGithubLedgerCommentClient(
							input.client,
							input.owner,
							input.repo,
							input.issueNumber,
						),
						{ dispatchAuthorized, authorLogin: input.commentAuthorLogin },
						new LedgerCommentPresenter(new LedgerMessages(input.locale)),
					),
			);
		container
			.bind(PlanCommunications)
			.toDynamicValue(() => new PlanCommunications());
		container
			.bind(SystemCommunicationClock)
			.toDynamicValue(() => new SystemCommunicationClock());
		CommunicationComposition.bindJourney(container, input);
		return container;
	}

	private static bindRepositories(container: Container) {
		// Event evaluation and recipients share the same source profiles and local supplements.
		const repository = container.get<ReferentialRepository>(
			SERVICES.referentialRepository,
		);
		let loaded: ReturnType<ReferentialRepository["load"]> | undefined;
		container
			.rebind<ReferentialRepository>(SERVICES.referentialRepository)
			.toConstantValue({
				load: () => {
					loaded ??= repository.load();
					return loaded;
				},
			});
	}

	private static bindGateways(
		container: Container,
		input: CommunicationCompositionInput,
	) {
		container
			.bind<MailGateway>(COMMUNICATION_SERVICES.mailGateway)
			.toDynamicValue((context) => {
				const client = getOctokit(input.mailingsToken);
				return new GithubRepositoryDispatchMailGateway(
					{
						createDispatchEvent: (parameters) =>
							client.rest.repos.createDispatchEvent(parameters),
					},
					context.get<AutomationConfig>(SERVICES.config).communication[
						"mailings-repository"
					],
				);
			});
		container
			.bind<NotificationGateway>(COMMUNICATION_SERVICES.notificationGateway)
			.toDynamicValue(() => new SlackNotificationGateway(input.slackToken));
	}

	private static bindJourney(
		container: Container,
		input: CommunicationCompositionInput,
	) {
		container.bind(ManageMeetupCommunications).toDynamicValue((context) => {
			const ledger = context.get<DeliveryLedgerFactory>(
				COMMUNICATION_SERVICES.ledgerFactory,
			);
			const planner = context.get(PlanCommunications);
			const clock = context.get(SystemCommunicationClock);
			const mailGateway = context.get<MailGateway>(
				COMMUNICATION_SERVICES.mailGateway,
			);
			const notificationGateway = context.get<NotificationGateway>(
				COMMUNICATION_SERVICES.notificationGateway,
			);
			return new ManageMeetupCommunications({
				feedbackResults: new OpenFeedbackTalkResultsGateway(
					input.openFeedbackApiKey ?? "",
				),
				clock,
				organizerApproval: new GithubOrganizerApproval(
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
				),
				config: context.get<AutomationConfig>(SERVICES.config),
				eventRepository: context.get<EventRepository>(SERVICES.eventRepository),
				referentialRepository: context.get<ReferentialRepository>(
					SERVICES.referentialRepository,
				),
				manageEvent: context.get(ManageMeetupEvent),
				eventDocumentCodec: context.get<EventDocumentCodec>(
					SERVICES.eventDocumentCodec,
				),
				reconcileCommunications: (dispatchAuthorized) =>
					new ReconcileCommunications({
						planner,
						clock,
						mailGateway,
						notificationGateway,
						ledger: ledger(dispatchAuthorized),
					}),
			});
		});
	}
}
