import {
	type EventDiagnostic,
	type EventDocument,
	type EventIdentity,
	EventNotFoundError,
	ensureEventDocumentIsCurrent,
	evaluateEventLifecycle,
	evaluateEventReadiness,
	eventRepositoryPatchIsEmpty,
	type MeetupEvent,
	POST_EVENT_TASK_NAMES,
	ReconcileEvent,
	type ReconcileEventDependencies,
} from "@meetup-automation/event";
import {
	createDefaultPublicationUrlPolicies,
	DEFAULT_PUBLICATION_URL_CONFIGURATION,
	type ManualPublicationTask,
	PublicationUrlPolicyEngine,
	planManualPublicationTasks,
} from "@meetup-automation/publication";
import {
	type ReferentialRepository,
	ResolveEventReferences,
	ValidateReferentialCatalog,
} from "@meetup-automation/referential";
import type { AutomationConfig } from "../config/automation-config.js";
import type { PublicDiagnostic } from "../result/result-envelope.js";

export interface ManageMeetupEventDependencies {
	readonly config: AutomationConfig;
	readonly referentialRepository: ReferentialRepository;
	readonly eventDependencies: ReconcileEventDependencies;
}

export type ManageMeetupEventResult =
	| {
			skipped: true;
			diagnostics: readonly PublicDiagnostic[];
	  }
	| {
			skipped: false;
			event: MeetupEvent;
			state: string;
			isReady: boolean;
			manualPublicationTasks: readonly ManualPublicationTask[];
			persisted: boolean;
			commentUpdated: boolean;
			diagnostics: readonly PublicDiagnostic[];
	  };

export class ManageMeetupEvent {
	constructor(private readonly dependencies: ManageMeetupEventDependencies) {}

	async execute(input: {
		identity: EventIdentity;
		mode: "check" | "fix";
		/** Optional immutable source captured by the composition boundary. */
		sourceDocument?: EventDocument;
	}): Promise<ManageMeetupEventResult> {
		const config = this.dependencies.config;
		const eventDependencies = this.dependencies.eventDependencies;
		const sourceDocument =
			input.sourceDocument ??
			(await eventDependencies.repository.find(input.identity));
		if (!sourceDocument) {
			throw new EventNotFoundError(input.identity);
		}
		if (!sourceDocument.labels.includes(config.event["issue-label"])) {
			return { skipped: true, diagnostics: [] };
		}

		const eventResult = await new ReconcileEvent(eventDependencies).execute({
			identity: input.identity,
			mode: "check",
			sourceDocument,
		});

		const catalogValidation = await new ValidateReferentialCatalog(
			this.dependencies.referentialRepository,
		).execute();
		const eventDiagnostics: EventDiagnostic[] = [...eventResult.diagnostics];
		let event = eventResult.event;

		if (catalogValidation.isValid) {
			const speakerReferences = event.agenda.flatMap((entry) =>
				entry.speakers.map(renderReference),
			);
			const resolution = new ResolveEventReferences().execute(
				catalogValidation.catalog,
				{
					hostReference: event.host ? renderReference(event.host) : "",
					speakerReferences,
				},
			);
			eventDiagnostics.push(
				...resolution.diagnostics.map((item) =>
					toEventDiagnostic(item.code, item.severity, item.path, item.message),
				),
			);
			if (resolution.resolved) {
				event = enrichStableReferences(
					event,
					resolution.host,
					resolution.speakers,
				);
			}
		} else {
			eventDiagnostics.push(
				...catalogValidation.diagnostics.map((item) =>
					toEventDiagnostic(item.code, item.severity, item.path, item.message),
				),
			);
		}

		const publication = evaluatePublication(event, config);
		event = publication.event;
		eventDiagnostics.push(...publication.diagnostics);
		const manualPublicationTasks = planEventManualPublicationTasks(event);

		const readiness = evaluateEventReadiness(event, eventDiagnostics);
		const lifecycle = evaluateEventLifecycle({
			event,
			readiness,
			now: eventDependencies.clock.now(),
		});
		const repositoryPatch = eventDependencies.documentCodec.createPatch(
			sourceDocument,
			event,
		);
		let persisted = false;
		let commentUpdated = false;
		if (input.mode === "fix") {
			if (!eventRepositoryPatchIsEmpty(repositoryPatch)) {
				await ensureEventDocumentIsCurrent(
					eventDependencies.repository,
					input.identity,
					sourceDocument,
				);
				await eventDependencies.repository.applyPatch(
					input.identity,
					repositoryPatch,
				);
				persisted = true;
			}
			commentUpdated = (
				await eventDependencies.commentRepository.reconcileDiagnostics(
					input.identity,
					readiness.diagnostics,
				)
			).changed;
		}

		return {
			skipped: false,
			event,
			state: lifecycle.state,
			isReady: readiness.isReady,
			manualPublicationTasks,
			persisted,
			commentUpdated,
			diagnostics: [
				...readiness.diagnostics.map(toPublicDiagnostic),
				...pendingManualTaskDiagnostics(manualPublicationTasks),
			],
		};
	}
}

function renderReference(reference: {
	id?: string;
	displayName: string;
}): string {
	return reference.id
		? `${reference.displayName} [${reference.id}]`
		: reference.displayName;
}

function enrichStableReferences(
	event: MeetupEvent,
	host: { id: string; displayName: string },
	speakers: readonly { id: string; displayName: string }[],
): MeetupEvent {
	return {
		...event,
		host: { id: host.id, displayName: host.displayName },
		agenda: event.agenda.map((entry) => ({
			...entry,
			speakers: entry.speakers.map((reference) => {
				const matches = speakers.filter(
					(speaker) =>
						speaker.id === reference.id ||
						canonical(speaker.displayName) === canonical(reference.displayName),
				);
				const speaker = matches.length === 1 ? matches[0] : undefined;
				return speaker
					? { id: speaker.id, displayName: speaker.displayName }
					: reference;
			}),
		})),
	};
}

function evaluatePublication(
	event: MeetupEvent,
	config: AutomationConfig,
): { event: MeetupEvent; diagnostics: EventDiagnostic[] } {
	const diagnostics: EventDiagnostic[] = [];
	for (const field of ["meetup", "community", "assets"] as const) {
		const value = event.publicationLinks[field];
		if (!value) {
			diagnostics.push({
				code: `publication.${field}.missing`,
				severity: "warning",
				category: "incomplete",
				field: `publicationLinks.${field}`,
				message: `${field} publication link is required before the event is ready`,
			});
		}
	}
	const engine = new PublicationUrlPolicyEngine(
		createDefaultPublicationUrlPolicies({
			...DEFAULT_PUBLICATION_URL_CONFIGURATION,
			meetupEventUrlPrefix: config.publication["meetup-event-url-prefix"],
			communityEventUrlPrefixes: [
				config.publication["cncf-event-url-prefix"],
				...DEFAULT_PUBLICATION_URL_CONFIGURATION.communityEventUrlPrefixes.slice(
					1,
				),
			],
		}),
	);
	const evaluation = engine.evaluate(event.publicationLinks);
	diagnostics.push(
		...evaluation.diagnostics.map((item) => ({
			code: item.code,
			severity: item.severity,
			category:
				item.severity === "error"
					? ("invalid" as const)
					: ("normalization" as const),
			field: `publicationLinks.${item.field}`,
			message: item.message,
			fixAvailable: item.fixAvailable,
		})),
	);
	return {
		event: { ...event, publicationLinks: evaluation.references },
		diagnostics,
	};
}

function planEventManualPublicationTasks(
	event: MeetupEvent,
): readonly ManualPublicationTask[] {
	return planManualPublicationTasks({
		eventId: `${event.identity.repository}#${event.identity.issueNumber}`,
		title: event.eventTitle,
		description: event.description,
		date: event.date,
		timeZone: event.timeZone,
		occurrenceStatus: event.occurrenceStatus,
		references: event.publicationLinks,
		slidesPublished: checklistTaskIsCompleted(
			event.operationalChecklists.postEvent,
			POST_EVENT_TASK_NAMES.shareSlides,
		),
		attendanceImported: checklistTaskIsCompleted(
			event.operationalChecklists.postEvent,
			POST_EVENT_TASK_NAMES.importAttendance,
		),
	});
}

function checklistTaskIsCompleted(
	items: MeetupEvent["operationalChecklists"]["postEvent"],
	name: string,
): boolean {
	const matches = items.filter((item) => item.name === name);
	return matches.length === 1 && matches[0]?.completed === true;
}

function pendingManualTaskDiagnostics(
	tasks: readonly ManualPublicationTask[],
): readonly PublicDiagnostic[] {
	return tasks
		.filter((task) => task.status === "pending")
		.map((task) => ({
			code: `publication.manual-task.${task.kind}.pending`,
			severity: "info" as const,
			field: `manualPublicationTasks.${task.kind}`,
			message: `Manual task pending: ${task.reason}`,
		}));
}

function toEventDiagnostic(
	code: string,
	severity: "error" | "warning",
	field: string,
	message: string,
): EventDiagnostic {
	return {
		code,
		severity,
		category: severity === "error" ? "invalid" : "migration",
		field,
		message,
	};
}

function toPublicDiagnostic(item: EventDiagnostic): PublicDiagnostic {
	return {
		code: item.code,
		severity: item.severity,
		field: item.field,
		message: item.message,
		fixApplied: false,
	};
}

function canonical(value: string): string {
	return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}
