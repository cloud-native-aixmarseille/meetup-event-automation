import { ConferenceHallProposalSource } from "@meetup-automation/conference-hall-proposal-source";
import type { getOctokit } from "@actions/github";
import { CsvReferentialRepository } from "@meetup-automation/csv-referential-repository";
import {
	type EventClock,
	type EventCommentRepository,
	type EventDocumentCodec,
	type EventRepository,
	EventRuleFactory,
	ListActiveEvents,
	type ReconcileEventDependencies,
} from "@meetup-automation/event";
import { GitHubEventCommentRepository } from "@meetup-automation/github-event-comment-repository";
import { GitHubEventRepository } from "@meetup-automation/github-event-repository";
import { AttentionCommentRetention } from "@meetup-automation/github-organizer-attention";
import { GitHubIssueFormEventDocumentCodec } from "@meetup-automation/github-issue-form-event-document-codec";
import {
	type AutomationConfig,
	AutomationConfigFactory,
	type IssueFormProjection,
	ManageMeetupEvent,
	SynchronizeMeetupIssueForm,
	ValidateMeetupReferentials,
} from "@meetup-automation/journey";
import type { Locale } from "@meetup-automation/localization";
import {
	type ProposalSource,
	type ReferentialRepository,
	SourceSpeakerReferentialRepository,
} from "@meetup-automation/referential";
import { SystemEventClock } from "@meetup-automation/system-clock";
import { YamlIssueFormProjection } from "@meetup-automation/yaml-issue-form-projection";
import { Container } from "inversify";
import {
	ConferenceHallInput,
	type ConferenceHallSettings,
} from "./conference-hall-input.js";

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
	readonly client: GitHubClient;
	readonly owner: string;
	readonly repo: string;
	readonly commentAuthorLogin?: string;
	readonly retireCommunicationReports?: boolean;
}

export interface EventCompositionInput
	extends EventDocumentCompositionInput,
		ConferenceHallSettings {}

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
					AutomationConfigFactory.createAutomationConfig(input.owner),
			);
		container
			.bind<ReferentialRepository>(SERVICES.referentialRepository)
			.toDynamicValue((context) => {
				const config = context.get<AutomationConfig>(SERVICES.config);
				return new CsvReferentialRepository({
					workspaceRoot,
					hostsPath: config.referentials.hosts,
					speakersPath: config.referentials.speakers,
				});
			});
		container
			.bind<IssueFormProjection>(SERVICES.issueFormProjection)
			.toDynamicValue(
				() =>
					new YamlIssueFormProjection({
						workspaceRoot,
						locale: input.locale,
					}),
			);
		container.bind(ValidateMeetupReferentials).toDynamicValue(
			(context) =>
				new ValidateMeetupReferentials({
					config: context.get<AutomationConfig>(SERVICES.config),
					referentialRepository: context.get<ReferentialRepository>(
						SERVICES.referentialRepository,
					),
				}),
		);
		container.bind(SynchronizeMeetupIssueForm).toDynamicValue(
			(context) =>
				new SynchronizeMeetupIssueForm({
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
					rules: EventRuleFactory.createDefaultEventRules({
						meetup: config.event["issue-label"],
						hostNeeded: "hoster:needed",
						hostConfirmed: config.event["required-confirmation-labels"][0],
						speakersNeeded: "speakers:needed",
						speakersConfirmed: config.event["required-confirmation-labels"][1],
						occurrencePostponed: "event:postponed",
						occurrenceHeld: "event:held",
						occurrenceCancelled: "event:cancelled",
					}),
				};
			});
		container.bind(ListActiveEvents).toDynamicValue(
			(context) =>
				new ListActiveEvents({
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
		const sourceSettings = ConferenceHallInput.validate(input);
		const container = EventComposition.createDocumentContainer(input);
		EventComposition.bindProposalSource(container, sourceSettings);
		container.bind(ManageMeetupEvent).toDynamicValue(
			(context) =>
				new ManageMeetupEvent({
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
		const source = new ConferenceHallProposalSource(
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
				new SourceSpeakerReferentialRepository(local, source, {
					provider: "conference-hall",
					event: input.conferenceHallEvent,
				}),
			);
	}

	private static bindEventAdapters(
		container: Container,
		input: EventDocumentCompositionInput,
	) {
		container
			.bind<EventRepository>(SERVICES.eventRepository)
			.toDynamicValue(() => new GitHubEventRepository(input.client, input));
		container
			.bind<EventDocumentCodec>(SERVICES.eventDocumentCodec)
			.toDynamicValue((context) => {
				const config = context.get<AutomationConfig>(SERVICES.config);
				return new GitHubIssueFormEventDocumentCodec({
					repositoryRef:
						input.repositoryRef ?? (process.env.GITHUB_SHA || "main"),
					timeZone: config.timezone,
					hostConfirmationLabel:
						config.event["required-confirmation-labels"][0],
					speakersConfirmationLabel:
						config.event["required-confirmation-labels"][1],
				});
			});
		const commentAuthorLogin = input.commentAuthorLogin;
		if (commentAuthorLogin)
			container
				.bind<EventCommentRepository>(SERVICES.eventCommentRepository)
				.toDynamicValue(
					() =>
						new GitHubEventCommentRepository(input.client, {
							owner: input.owner,
							repo: input.repo,
							authorLogin: commentAuthorLogin,
							locale: input.locale,
							retireCommunicationReports: input.retireCommunicationReports,
							retainedContent: new AttentionCommentRetention(
								input.client,
								input.owner,
								input.repo,
								commentAuthorLogin,
							),
						}),
				);
		container
			.bind<EventClock>(SERVICES.eventClock)
			.toDynamicValue(() => new SystemEventClock());
	}
}
