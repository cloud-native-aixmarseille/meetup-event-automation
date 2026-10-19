import { getOctokit } from "@actions/github";
import {
	CommunicationDomainComposition,
	type DeliveryLedger,
	type MailGateway,
	PlanCommunications,
} from "@meetup-automation/communication";
import type {
	EventDocumentCodec,
	EventRepository,
} from "@meetup-automation/event";
import { GithubDeliveryLedgerComposition } from "@meetup-automation/github-delivery-ledger";
import { GithubOrganizerApprovalComposition } from "@meetup-automation/github-organizer-approval";
import { GithubRepositoryDispatchMailGatewayComposition } from "@meetup-automation/github-repository-dispatch-mail-gateway";
import {
	type AutomationConfig,
	JourneyCommunicationComposition,
	ManageMeetupCommunications,
	ManageMeetupEvent,
} from "@meetup-automation/journey";
import { OpenfeedbackEventGatewayComposition } from "@meetup-automation/openfeedback-event-gateway";
import type { ReferentialRepository } from "@meetup-automation/referential";
import { SlackNotificationGatewayComposition } from "@meetup-automation/slack-notification-gateway";
import {
	SystemClockComposition,
	SystemCommunicationClock,
} from "@meetup-automation/system-clock";
import type { Container } from "inversify";
import {
	EventComposition,
	type EventCompositionInput,
	SERVICES,
} from "./composition.js";
import { ContentGateComposition } from "./content-gate-composition.js";
import { OrganizerApprovalComposition } from "./organizer-approval-composition.js";

const COMMUNICATION_SERVICES = {
	mailGateway: Symbol("MailGateway"),
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
					new GithubDeliveryLedgerComposition().githubDeliveryLedger(
						new GithubDeliveryLedgerComposition().scopedGithubLedgerCommentClient(
							input.client,
							input.owner,
							input.repo,
							input.issueNumber,
						),
						{ dispatchAuthorized, authorLogin: input.commentAuthorLogin },
						new GithubDeliveryLedgerComposition().ledgerCommentPresenter(
							new GithubDeliveryLedgerComposition().ledgerMessages(
								input.locale,
							),
						),
					),
			);
		container
			.bind(PlanCommunications)
			.toDynamicValue(() =>
				new CommunicationDomainComposition().planCommunications(),
			);
		container
			.bind(SystemCommunicationClock)
			.toDynamicValue(() =>
				new SystemClockComposition().systemCommunicationClock(),
			);
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
				return new GithubRepositoryDispatchMailGatewayComposition().githubRepositoryDispatchMailGateway(
					{
						createDispatchEvent: (parameters) =>
							client.rest.repos.createDispatchEvent(parameters),
					},
					context.get<AutomationConfig>(SERVICES.config).communication[
						"mailings-repository"
					],
				);
			});
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
			return new JourneyCommunicationComposition().manageMeetupCommunications({
				contentGate: new ContentGateComposition().create(
					input,
					input.issueNumber,
					input.commentAuthorLogin,
				),
				feedbackResults:
					new OpenfeedbackEventGatewayComposition().openFeedbackTalkResultsGateway(
						input.openFeedbackApiKey ?? "",
					),
				clock,
				organizerApproval: OrganizerApprovalComposition.create(
					new GithubOrganizerApprovalComposition().githubApprovalClient(
						input.client,
						input.owner,
						input.repo,
						input.issueNumber,
					),
					input.commentAuthorLogin,
					new GithubOrganizerApprovalComposition().approvalPresenter(
						new GithubOrganizerApprovalComposition().approvalMessages(
							input.locale,
						),
					),
					new SlackNotificationGatewayComposition().slackApprovalNotification(
						input.slackToken,
						new SlackNotificationGatewayComposition().slackApprovalPresenter(
							input.locale,
						),
					),
					input.slackOrganizerChannelId,
				).approval,
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
					new CommunicationDomainComposition().reconcileCommunications({
						planner,
						clock,
						mailGateway,
						ledger: ledger(dispatchAuthorized),
					}),
			});
		});
	}
}
