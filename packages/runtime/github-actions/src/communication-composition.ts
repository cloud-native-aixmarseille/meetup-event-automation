import { getOctokit } from "@actions/github";
import {
	type CommunicationApprovalRepository,
	type DeliveryLedger,
	type MailGateway,
	type NotificationGateway,
	PlanCommunications,
	ReconcileCommunications,
} from "@meetup-automation/communication";
import type { EventRepository } from "@meetup-automation/event";
import { GithubCommunicationApprovalRepository } from "@meetup-automation/github-communication-approval-repository";
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
import {
	createEventContainer,
	type EventCompositionInput,
	SERVICES,
} from "./composition.js";

const COMMUNICATION_SERVICES = {
	approvalRepository: Symbol("CommunicationApprovalRepository"),
	mailGateway: Symbol("MailGateway"),
	notificationGateway: Symbol("NotificationGateway"),
	ledgerFactory: Symbol("DeliveryLedgerFactory"),
};

type DeliveryLedgerFactory = (dispatchAuthorized: boolean) => DeliveryLedger;

export function createCommunicationContainer(
	input: EventCompositionInput & {
		readonly issueNumber: number;
		readonly mailingsToken: string;
		readonly slackToken: string;
	},
) {
	const container = createEventContainer(input);
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
	container
		.bind<CommunicationApprovalRepository>(
			COMMUNICATION_SERVICES.approvalRepository,
		)
		.toDynamicValue(
			() =>
				new GithubCommunicationApprovalRepository(input.client, {
					owner: input.owner,
					repo: input.repo,
					issueNumber: input.issueNumber,
					trustedAuthorLogin: input.commentAuthorLogin,
				}),
		);
	container
		.bind<MailGateway>(COMMUNICATION_SERVICES.mailGateway)
		.toDynamicValue((context) => {
			if (!input.mailingsToken)
				return {
					dispatch: async () => ({
						outcome: "uncertain" as const,
						diagnosticCode: "unknown-provider-state" as const,
					}),
				};
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
			config: context.get<AutomationConfig>(SERVICES.config),
			eventRepository: context.get<EventRepository>(SERVICES.eventRepository),
			referentialRepository: context.get<ReferentialRepository>(
				SERVICES.referentialRepository,
			),
			manageEvent: context.get(ManageMeetupEvent),
			approvalRepository: context.get<CommunicationApprovalRepository>(
				COMMUNICATION_SERVICES.approvalRepository,
			),
			actorCanApprove: async (actor) => {
				if (!/^[A-Za-z0-9_.-]+$/.test(actor)) return false;
				const { data } =
					await input.client.rest.repos.getCollaboratorPermissionLevel({
						owner: input.owner,
						repo: input.repo,
						username: actor,
					});
				return [data.permission, data.role_name].some((value) =>
					["admin", "maintain", "write", "triage"].includes(value),
				);
			},
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
	return container;
}
