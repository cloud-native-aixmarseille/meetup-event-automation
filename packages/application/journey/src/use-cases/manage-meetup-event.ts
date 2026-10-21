import {
	type EventDiagnostic,
	type EventDocument,
	type EventDocumentConcurrency,
	type EventIdentity,
	type EventLifecycle,
	EventNotFoundError,
	type EventReadinessPolicy,
	type EventRepositoryPatches,
	type MeetupEvent,
	type ReconcileEvent,
	type ReconcileEventArguments,
} from "@meetup-automation/event";
import type {
	ResolveEventReferences,
	ValidateReferentialCatalog,
	ValidateReferentialCatalogArguments,
} from "@meetup-automation/referential";
import type { EventDiagnosticProjection } from "./event-diagnostic-projection.js";
import type { EventParticipantResolution } from "./event-participant-resolution.js";
import type { EventPublicationEvaluation } from "./event-publication-evaluation.js";
import type {
	ManageMeetupEventDependencies,
	ManageMeetupEventResult,
} from "./manage-meetup-event-contracts.js";
import type {
	RefreshSelectedProposals,
	RefreshSelectedProposalsArguments,
} from "./refresh-selected-proposals.js";

export interface ManageMeetupEventCollaborators {
	readonly eventPublicationEvaluation: Pick<
		EventPublicationEvaluation,
		| "evaluatePublication"
		| "planEventManualPublicationTasks"
		| "pendingManualTaskDiagnostics"
	>;
	readonly eventReadinessPolicy: Pick<
		EventReadinessPolicy,
		"evaluateEventReadiness"
	>;
	readonly eventLifecycle: Pick<EventLifecycle, "evaluateEventLifecycle">;
	readonly eventDiagnosticProjection: Pick<
		EventDiagnosticProjection,
		"toPublicDiagnostic" | "toEventDiagnostic"
	>;
	readonly eventParticipantResolution: Pick<
		EventParticipantResolution,
		"renderReference" | "enrichStableReferences"
	>;
	readonly eventRepositoryPatches: Pick<
		EventRepositoryPatches,
		"eventRepositoryPatchIsEmpty"
	>;
	readonly eventDocumentConcurrency: Pick<
		EventDocumentConcurrency,
		"ensureEventDocumentIsCurrent"
	>;
	readonly createReconcileEvent: (
		...args: ReconcileEventArguments
	) => ReconcileEvent;
	readonly createValidateReferentialCatalog: (
		...args: ValidateReferentialCatalogArguments
	) => ValidateReferentialCatalog;
	readonly createRefreshSelectedProposals: (
		...args: RefreshSelectedProposalsArguments
	) => RefreshSelectedProposals;
	readonly createResolveEventReferences: () => ResolveEventReferences;
}

export class ManageMeetupEvent {
	constructor(
		private readonly collaborators: ManageMeetupEventCollaborators,
		private readonly dependencies: ManageMeetupEventDependencies,
	) {}

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

		const eventResult = await this.collaborators
			.createReconcileEvent(eventDependencies)
			.execute({
				identity: input.identity,
				mode: "check",
				sourceDocument,
			});

		const eventDiagnostics: EventDiagnostic[] = [...eventResult.diagnostics];
		let event = await this.resolveParticipants(
			eventResult.event,
			eventDiagnostics,
		);

		const publication =
			this.collaborators.eventPublicationEvaluation.evaluatePublication(
				event,
				config,
			);
		event = publication.event;
		eventDiagnostics.push(...publication.diagnostics);
		const manualPublicationTasks =
			this.collaborators.eventPublicationEvaluation.planEventManualPublicationTasks(
				event,
			);

		const readiness =
			this.collaborators.eventReadinessPolicy.evaluateEventReadiness(
				event,
				eventDiagnostics,
			);
		const lifecycle = this.collaborators.eventLifecycle.evaluateEventLifecycle({
			event,
			readiness,
			now: eventDependencies.clock.now(),
		});
		const persisted = await this.persist(sourceDocument, event, input.mode);

		return {
			skipped: false,
			event,
			state: lifecycle.state,
			isReady: readiness.isReady,
			manualPublicationTasks,
			persisted,
			diagnostics: [
				...readiness.diagnostics.map(
					this.collaborators.eventDiagnosticProjection.toPublicDiagnostic.bind(
						this.collaborators.eventDiagnosticProjection,
					),
				),
				...this.collaborators.eventPublicationEvaluation.pendingManualTaskDiagnostics(
					manualPublicationTasks,
				),
			],
		};
	}

	private async resolveParticipants(
		event: MeetupEvent,
		eventDiagnostics: EventDiagnostic[],
	) {
		const catalogValidation = await this.collaborators
			.createValidateReferentialCatalog(this.dependencies.referentialRepository)
			.execute();

		if (catalogValidation.isValid) {
			event = await this.collaborators
				.createRefreshSelectedProposals(this.dependencies.proposalSource)
				.execute(event, catalogValidation.catalog, eventDiagnostics);
			const speakerReferences = event.agenda.flatMap((entry) =>
				entry.speakers.map(
					this.collaborators.eventParticipantResolution.renderReference.bind(
						this.collaborators.eventParticipantResolution,
					),
				),
			);
			const resolution = this.collaborators
				.createResolveEventReferences()
				.execute(catalogValidation.catalog, {
					hostReference: event.host
						? this.collaborators.eventParticipantResolution.renderReference(
								event.host,
							)
						: "",
					speakerReferences,
				});
			eventDiagnostics.push(
				...resolution.diagnostics.map((item) =>
					this.collaborators.eventDiagnosticProjection.toEventDiagnostic(
						item.code,
						item.severity,
						item.path,
						item.message,
					),
				),
			);
			if (resolution.resolved) {
				event =
					this.collaborators.eventParticipantResolution.enrichStableReferences(
						event,
						resolution.host,
						resolution.speakers,
					);
			}
		} else {
			if (event.proposalReferences?.length)
				event = { ...event, proposalStatus: "stale" };
			eventDiagnostics.push(
				...catalogValidation.diagnostics.map((item) =>
					this.collaborators.eventDiagnosticProjection.toEventDiagnostic(
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
	) {
		const eventDependencies = this.dependencies.eventDependencies;
		const repositoryPatch = eventDependencies.documentCodec.createPatch(
			sourceDocument,
			event,
		);
		if (
			mode === "check" ||
			this.collaborators.eventRepositoryPatches.eventRepositoryPatchIsEmpty(
				repositoryPatch,
			)
		)
			return false;
		await this.collaborators.eventDocumentConcurrency.ensureEventDocumentIsCurrent(
			eventDependencies.repository,
			sourceDocument.identity,
			sourceDocument,
		);
		await eventDependencies.repository.applyPatch(
			sourceDocument.identity,
			repositoryPatch,
		);
		return true;
	}
}
export type ManageMeetupEventArguments =
	ConstructorParameters<typeof ManageMeetupEvent> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
