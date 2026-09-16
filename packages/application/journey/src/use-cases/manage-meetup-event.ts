import {
	type EventDiagnostic,
	type EventDocument,
	type EventIdentity,
	EventLifecycle,
	EventNotFoundError,
	EventReadinessPolicy,
	EventRepositoryPatches,
	type MeetupEvent,
	ReconcileEvent,
} from "@meetup-automation/event";
import {
	ResolveEventReferences,
	ValidateReferentialCatalog,
} from "@meetup-automation/referential";
import { EventDiagnosticProjection } from "./event-diagnostic-projection.js";
import { EventParticipantResolution } from "./event-participant-resolution.js";
import { EventPublicationEvaluation } from "./event-publication-evaluation.js";
import type {
	ManageMeetupEventDependencies,
	ManageMeetupEventResult,
} from "./manage-meetup-event-contracts.js";

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

		const eventDiagnostics: EventDiagnostic[] = [...eventResult.diagnostics];
		let event = await this.resolveParticipants(
			eventResult.event,
			eventDiagnostics,
		);

		const publication = EventPublicationEvaluation.evaluatePublication(
			event,
			config,
		);
		event = publication.event;
		eventDiagnostics.push(...publication.diagnostics);
		const manualPublicationTasks =
			EventPublicationEvaluation.planEventManualPublicationTasks(event);

		const readiness = EventReadinessPolicy.evaluateEventReadiness(
			event,
			eventDiagnostics,
		);
		const lifecycle = EventLifecycle.evaluateEventLifecycle({
			event,
			readiness,
			now: eventDependencies.clock.now(),
		});
		const { persisted, commentUpdated } = await this.persist(
			sourceDocument,
			event,
			input.mode,
			readiness.diagnostics,
		);

		return {
			skipped: false,
			event,
			state: lifecycle.state,
			isReady: readiness.isReady,
			manualPublicationTasks,
			persisted,
			commentUpdated,
			diagnostics: [
				...readiness.diagnostics.map(
					EventDiagnosticProjection.toPublicDiagnostic,
				),
				...EventPublicationEvaluation.pendingManualTaskDiagnostics(
					manualPublicationTasks,
				),
			],
		};
	}

	private async resolveParticipants(
		event: MeetupEvent,
		eventDiagnostics: EventDiagnostic[],
	) {
		const catalogValidation = await new ValidateReferentialCatalog(
			this.dependencies.referentialRepository,
		).execute();

		if (catalogValidation.isValid) {
			const speakerReferences = event.agenda.flatMap((entry) =>
				entry.speakers.map(EventParticipantResolution.renderReference),
			);
			const resolution = new ResolveEventReferences().execute(
				catalogValidation.catalog,
				{
					hostReference: event.host
						? EventParticipantResolution.renderReference(event.host)
						: "",
					speakerReferences,
				},
			);
			eventDiagnostics.push(
				...resolution.diagnostics.map((item) =>
					EventDiagnosticProjection.toEventDiagnostic(
						item.code,
						item.severity,
						item.path,
						item.message,
					),
				),
			);
			if (resolution.resolved) {
				event = EventParticipantResolution.enrichStableReferences(
					event,
					resolution.host,
					resolution.speakers,
				);
			}
		} else {
			eventDiagnostics.push(
				...catalogValidation.diagnostics.map((item) =>
					EventDiagnosticProjection.toEventDiagnostic(
						item.code,
						item.severity,
						item.path,
						item.message,
					),
				),
			);
		}

		return event;
	}

	private async persist(
		sourceDocument: EventDocument,
		event: MeetupEvent,
		mode: "check" | "fix",
		diagnostics: readonly EventDiagnostic[],
	) {
		const eventDependencies = this.dependencies.eventDependencies;
		const repositoryPatch = eventDependencies.documentCodec.createPatch(
			sourceDocument,
			event,
		);
		let persisted = false;
		let commentUpdated = false;
		if (mode === "fix") {
			if (
				!EventRepositoryPatches.eventRepositoryPatchIsEmpty(repositoryPatch)
			) {
				await ReconcileEvent.ensureEventDocumentIsCurrent(
					eventDependencies.repository,
					sourceDocument.identity,
					sourceDocument,
				);
				await eventDependencies.repository.applyPatch(
					sourceDocument.identity,
					repositoryPatch,
				);
				persisted = true;
			}
			commentUpdated = (
				await eventDependencies.commentRepository.reconcileDiagnostics(
					sourceDocument.identity,
					diagnostics,
				)
			).changed;
		}

		return { persisted, commentUpdated };
	}
}
