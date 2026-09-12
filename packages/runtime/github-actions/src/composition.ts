import type { getOctokit } from "@actions/github";
import { CsvReferentialRepository } from "@meetup-automation/csv-referential-repository";
import {
	createDefaultEventRules,
	type EventClock,
	type EventCommentRepository,
	type EventDocumentCodec,
	type EventRepository,
	ListActiveEvents,
	type ReconcileEventDependencies,
} from "@meetup-automation/event";
import { GitHubEventCommentRepository } from "@meetup-automation/github-event-comment-repository";
import { GitHubEventRepository } from "@meetup-automation/github-event-repository";
import { GitHubIssueFormEventDocumentCodec } from "@meetup-automation/github-issue-form-event-document-codec";
import {
	type AutomationConfig,
	createAutomationConfig,
	type IssueFormProjection,
	ManageMeetupEvent,
	SynchronizeMeetupIssueForm,
	ValidateMeetupReferentials,
} from "@meetup-automation/journey";
import type { ReferentialRepository } from "@meetup-automation/referential";
import { SystemEventClock } from "@meetup-automation/system-clock";
import { YamlIssueFormProjection } from "@meetup-automation/yaml-issue-form-projection";
import { Container } from "inversify";

type GitHubClient = ReturnType<typeof getOctokit>;

export const SERVICES = {
	config: Symbol("AutomationConfig"),
	referentialRepository: Symbol("ReferentialRepository"),
	issueFormProjection: Symbol("IssueFormProjection"),
	eventRepository: Symbol("EventRepository"),
	eventDocumentCodec: Symbol("EventDocumentCodec"),
	eventCommentRepository: Symbol("EventCommentRepository"),
	eventClock: Symbol("EventClock"),
	eventDependencies: Symbol("ReconcileEventDependencies"),
};

export interface WorkspaceCompositionInput {
	readonly config?: AutomationConfig;
	readonly workspaceRoot?: string;
}

export interface EventCompositionInput extends WorkspaceCompositionInput {
	readonly client: GitHubClient;
	readonly owner: string;
	readonly repo: string;
	readonly commentAuthorLogin: string;
}

/** One container per invocation: no credentials or cached data survive a run. */
export function createReferentialContainer(
	input: WorkspaceCompositionInput = {},
): Container {
	const container = new Container({ defaultScope: "Singleton" });
	const workspaceRoot = input.workspaceRoot ?? process.cwd();
	container
		.bind<AutomationConfig>(SERVICES.config)
		.toConstantValue(input.config ?? createAutomationConfig());
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
		.toDynamicValue(() => new YamlIssueFormProjection({ workspaceRoot }));
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

export function createEventContainer(input: EventCompositionInput): Container {
	const container = createReferentialContainer(input);
	container
		.bind<EventRepository>(SERVICES.eventRepository)
		.toDynamicValue(() => new GitHubEventRepository(input.client, input));
	container
		.bind<EventDocumentCodec>(SERVICES.eventDocumentCodec)
		.toDynamicValue((context) => {
			const config = context.get<AutomationConfig>(SERVICES.config);
			return new GitHubIssueFormEventDocumentCodec({
				timeZone: config.timezone,
				hostConfirmationLabel: config.event["required-confirmation-labels"][0],
				speakersConfirmationLabel:
					config.event["required-confirmation-labels"][1],
			});
		});
	container
		.bind<EventCommentRepository>(SERVICES.eventCommentRepository)
		.toDynamicValue(
			() =>
				new GitHubEventCommentRepository(input.client, {
					owner: input.owner,
					repo: input.repo,
					authorLogin: input.commentAuthorLogin,
				}),
		);
	container
		.bind<EventClock>(SERVICES.eventClock)
		.toDynamicValue(() => new SystemEventClock());
	container
		.bind<ReconcileEventDependencies>(SERVICES.eventDependencies)
		.toDynamicValue((context) => {
			const config = context.get<AutomationConfig>(SERVICES.config);
			return {
				repository: context.get<EventRepository>(SERVICES.eventRepository),
				documentCodec: context.get<EventDocumentCodec>(
					SERVICES.eventDocumentCodec,
				),
				commentRepository: context.get<EventCommentRepository>(
					SERVICES.eventCommentRepository,
				),
				clock: context.get<EventClock>(SERVICES.eventClock),
				rules: createDefaultEventRules({
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
	container.bind(ManageMeetupEvent).toDynamicValue(
		(context) =>
			new ManageMeetupEvent({
				config: context.get<AutomationConfig>(SERVICES.config),
				referentialRepository: context.get<ReferentialRepository>(
					SERVICES.referentialRepository,
				),
				eventDependencies: context.get<ReconcileEventDependencies>(
					SERVICES.eventDependencies,
				),
			}),
	);
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
