import {
	GithubOrganizerApproval,
	GithubApprovalClient,
	ApprovalPresenter,
	ApprovalMessages,
} from "@meetup-automation/github-organizer-approval";
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
	ScopedGithubLedgerCommentClient,
} from "@meetup-automation/github-delivery-ledger";
import { GithubRepositoryDispatchMailGateway } from "@meetup-automation/github-repository-dispatch-mail-gateway";
import {
	type AutomationConfig,
	ManageMeetupCommunications,
	ManageMeetupEvent,
} from "@meetup-automation/journey";
import type { ReferentialRepository } from "@meetup-automation/referential";
import { SlackNotificationGateway } from "@meetup-automation/slack-notification-gateway";
import { SystemCommunicationClock } from "@meetup-automation/system-clock";
import type { Container } from "inversify";
import { CommunicationIssueReport } from "./communication-issue-report.js";
import {
	EventComposition,
	type EventCompositionInput,
	SERVICES,
} from "./composition.js";
import { ActionMessages } from "./i18n/action-messages.js";

const COMMUNICATION_SERVICES = {
	mailGateway: Symbol("MailGateway"),
	notificationGateway: Symbol("NotificationGateway"),
	ledgerFactory: Symbol("DeliveryLedgerFactory"),
};

type CommunicationCompositionInput = EventCompositionInput & {
	readonly issueNumber: number;
	readonly mailingsToken: string;
	readonly slackToken: string;
	readonly slackOrganizerChannelId: string;
};

type DeliveryLedgerFactory = (dispatchAuthorized: boolean) => DeliveryLedger;

export class CommunicationComposition {
	static createIssueReport(
		input: EventCompositionInput & { readonly issueNumber: number },
	): CommunicationIssueReport {
		return new CommunicationIssueReport(
			new ScopedGithubLedgerCommentClient(
				input.client,
				input.owner,
				input.repo,
				input.issueNumber,
			),
			input.commentAuthorLogin,
			new ActionMessages(input.locale),
		);
	}

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
		// Both event evaluation and recipient resolution must see the same CSV snapshot.
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
					notificationGateway,
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
