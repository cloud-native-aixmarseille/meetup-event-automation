import type { getOctokit } from "@actions/github";
import { ConferenceHallProposalSourceComposition } from "@meetup-automation/conference-hall-proposal-source";
import { CsvReferentialRepositoryComposition } from "@meetup-automation/csv-referential-repository";
import {
	type EventClock,
	type EventCommentRepository,
	type EventDocumentCodec,
	EventDomainComposition,
	type EventRepository,
	ListActiveEvents,
	type ReconcileEventDependencies,
} from "@meetup-automation/event";
import { GithubEventCommentRepositoryComposition } from "@meetup-automation/github-event-comment-repository";
import { GithubEventRepositoryComposition } from "@meetup-automation/github-event-repository";
import { GithubIssueFormEventDocumentCodecComposition } from "@meetup-automation/github-issue-form-event-document-codec";
import { GithubOrganizerAttentionComposition } from "@meetup-automation/github-organizer-attention";
import {
	type AutomationConfig,
	type IssueFormProjection,
	JourneyComposition,
	JourneyPolicyComposition,
	ManageMeetupEvent,
	ReconcileMeetupIssueForm,
	ValidateMeetupReferentials,
} from "@meetup-automation/journey";
import type { Locale } from "@meetup-automation/localization";
import {
	type ProposalSource,
	ReferentialDomainComposition,
	type ReferentialRepository,
} from "@meetup-automation/referential";
import { SystemClockComposition } from "@meetup-automation/system-clock";
import { YamlIssueFormProjectionComposition } from "@meetup-automation/yaml-issue-form-projection";
import { Container } from "inversify";
import type { ConferenceHallSettings } from "./conference-hall-input.js";
import { GithubActionsComposition } from "./dependency-composition.js";
import { PublicationPolicyComposition } from "./publication-policy-composition.js";

type GitHubClient = ReturnType<typeof getOctokit>;

export const SERVICES = {
	config: Symbol("AutomationConfig"),
	referentialRepository: Symbol("ReferentialRepository"),
	proposalSource: Symbol("ProposalSource"),
	issueFormProjection: Symbol("IssueFormProjection"),
	eventRepository: Symbol("EventRepository"),
	eventDocumentCodec: Symbol("EventDocumentCodec"),
	eventCommentRepository: Symbol("EventCommentRepository"),
	eventClock: Symbol("EventClock"),
	eventDependencies: Symbol("ReconcileEventDependencies"),
};

export interface WorkspaceCompositionInput {
	readonly owner?: string;
	readonly locale?: Locale;
	readonly config?: AutomationConfig;
	readonly workspaceRoot?: string;
}

export interface EventDocumentCompositionInput
	extends WorkspaceCompositionInput {
	readonly repositoryRef?: string;
	readonly conferenceHallEventUrl?: string;
	readonly client: GitHubClient;
	readonly owner: string;
	readonly repo: string;
	readonly commentAuthorLogin?: string;
	readonly retireCommunicationReports?: boolean;
}

export interface EventCompositionInput
	extends EventDocumentCompositionInput,
		ConferenceHallSettings {
	readonly meetupEventUrlPrefix: string;
	readonly communityEventUrlPrefixes: readonly string[];
	readonly assetFolderUrlPrefix: string;
}

export class EventComposition {
	/** One container per invocation: no credentials or cached data survive a run. */
	static createReferentialContainer(
		input: WorkspaceCompositionInput = {},
	): Container {
		const container = new Container({ defaultScope: "Singleton" });
		const workspaceRoot = input.workspaceRoot ?? process.cwd();
		container
			.bind<AutomationConfig>(SERVICES.config)
			.toConstantValue(
				input.config ??
					new JourneyPolicyComposition()
						.automationConfigFactory()
						.createAutomationConfig(input.owner),
			);
		container
			.bind<ReferentialRepository>(SERVICES.referentialRepository)
			.toDynamicValue((context) => {
				const config = context.get<AutomationConfig>(SERVICES.config);
				return new CsvReferentialRepositoryComposition().csvReferentialRepository(
					{
						workspaceRoot,
						hostsPath: config.referentials.hosts,
						speakersPath: config.referentials.speakers,
					},
				);
			});
		container
			.bind<IssueFormProjection>(SERVICES.issueFormProjection)
			.toDynamicValue(() =>
				new YamlIssueFormProjectionComposition().yamlIssueFormProjection({
					workspaceRoot,
					locale: input.locale,
				}),
			);
		container.bind(ValidateMeetupReferentials).toDynamicValue((context) =>
			new JourneyComposition().validateMeetupReferentials({
				config: context.get<AutomationConfig>(SERVICES.config),
				referentialRepository: context.get<ReferentialRepository>(
					SERVICES.referentialRepository,
				),
			}),
		);
		container.bind(ReconcileMeetupIssueForm).toDynamicValue((context) =>
			new JourneyComposition().reconcileMeetupIssueForm({
				validateReferentials: context.get(ValidateMeetupReferentials),
				issueFormProjection: context.get<IssueFormProjection>(
					SERVICES.issueFormProjection,
				),
			}),
		);
		return container;
	}

	static createDocumentContainer(
		input: EventDocumentCompositionInput,
	): Container {
		const container = EventComposition.createReferentialContainer(input);
		EventComposition.bindEventAdapters(container, input);
		container
			.bind<ReconcileEventDependencies>(SERVICES.eventDependencies)
			.toDynamicValue((context) => {
				const config = context.get<AutomationConfig>(SERVICES.config);
				return {
					repository: context.get<EventRepository>(SERVICES.eventRepository),
					documentCodec: context.get<EventDocumentCodec>(
						SERVICES.eventDocumentCodec,
					),
					clock: context.get<EventClock>(SERVICES.eventClock),
					rules: new EventDomainComposition()
						.eventRuleFactory()
						.createDefaultEventRules({
							meetup: config.event["issue-label"],
							speakersNeeded: "speakers:needed",
							speakersConfirmed: config.event["speakers-confirmation-label"],
							occurrencePostponed: "event:postponed",
							occurrenceHeld: "event:held",
							occurrenceCancelled: "event:cancelled",
						}),
				};
			});
		container.bind(ListActiveEvents).toDynamicValue((context) =>
			new EventDomainComposition().listActiveEvents({
				repository: context.get<EventRepository>(SERVICES.eventRepository),
				documentCodec: context.get<EventDocumentCodec>(
					SERVICES.eventDocumentCodec,
				),
				clock: context.get<EventClock>(SERVICES.eventClock),
				rules: context.get<ReconcileEventDependencies>(
					SERVICES.eventDependencies,
				).rules,
			}),
		);
		return container;
	}

	static createEventContainer(input: EventCompositionInput): Container {
		const sourceSettings = new GithubActionsComposition()
			.conferenceHallInput()
			.validate(input);
		const publicationUrlPolicyEngine =
			new PublicationPolicyComposition().eventPublicationUrlPolicyEngine(
				input.meetupEventUrlPrefix,
				input.communityEventUrlPrefixes,
				input.assetFolderUrlPrefix,
			);
		const container = EventComposition.createDocumentContainer(input);
		EventComposition.bindProposalSource(container, sourceSettings);
		container.bind(ManageMeetupEvent).toDynamicValue((context) =>
			new JourneyComposition().manageMeetupEvent(publicationUrlPolicyEngine, {
				proposalSource: context.get<ProposalSource>(SERVICES.proposalSource),
				config: context.get<AutomationConfig>(SERVICES.config),
				referentialRepository: context.get<ReferentialRepository>(
					SERVICES.referentialRepository,
				),
				eventDependencies: context.get<ReconcileEventDependencies>(
					SERVICES.eventDependencies,
				),
			}),
		);
		return container;
	}

	private static bindProposalSource(
		container: Container,
		input: ConferenceHallSettings,
	) {
		const source =
			new ConferenceHallProposalSourceComposition().conferenceHallProposalSource(
				input.conferenceHallEvent,
				input.conferenceHallApiKey,
			);
		container
			.bind<ProposalSource>(SERVICES.proposalSource)
			.toConstantValue(source);
		const local = container.get<ReferentialRepository>(
			SERVICES.referentialRepository,
		);
		container
			.rebind<ReferentialRepository>(SERVICES.referentialRepository)
			.toConstantValue(
				new ReferentialDomainComposition().sourceSpeakerReferentialRepository(
					local,
					source,
					{
						provider: "conference-hall",
						event: input.conferenceHallEvent,
					},
				),
			);
	}

	private static bindEventAdapters(
		container: Container,
		input: EventDocumentCompositionInput,
	) {
		container
			.bind<EventRepository>(SERVICES.eventRepository)
			.toDynamicValue(() =>
				new GithubEventRepositoryComposition().gitHubEventRepository(
					input.client,
					input,
				),
			);
		container
			.bind<EventDocumentCodec>(SERVICES.eventDocumentCodec)
			.toDynamicValue((context) => {
				const config = context.get<AutomationConfig>(SERVICES.config);
				return new GithubIssueFormEventDocumentCodecComposition().gitHubIssueFormEventDocumentCodec(
					{
						conferenceHallEventUrl: input.conferenceHallEventUrl,
						repositoryRef:
							input.repositoryRef ?? (process.env.GITHUB_SHA || "main"),
						timeZone: config.timezone,
						speakersConfirmationLabel:
							config.event["speakers-confirmation-label"],
					},
				);
			});
		const commentAuthorLogin = input.commentAuthorLogin;
		if (commentAuthorLogin)
			container
				.bind<EventCommentRepository>(SERVICES.eventCommentRepository)
				.toDynamicValue(() =>
					new GithubEventCommentRepositoryComposition().gitHubEventCommentRepository(
						input.client,
						{
							owner: input.owner,
							repo: input.repo,
							authorLogin: commentAuthorLogin,
							locale: input.locale,
							retireCommunicationReports: input.retireCommunicationReports,
							retainedContent:
								new GithubOrganizerAttentionComposition().attentionCommentRetention(
									input.client,
									input.owner,
									input.repo,
									commentAuthorLogin,
								),
						},
					),
				);
		container
			.bind<EventClock>(SERVICES.eventClock)
			.toDynamicValue(() => new SystemClockComposition().systemEventClock());
	}
}
