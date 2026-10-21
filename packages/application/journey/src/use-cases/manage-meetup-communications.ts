import type { ReconcileCommunicationsInput } from "@meetup-automation/communication";
import type {
	EventDocument,
	EventDocumentConcurrency,
	EventRepository,
} from "@meetup-automation/event";
import type {
	CommunicationJourneyDiagnostic,
	ManageMeetupCommunicationsInput,
	ManageMeetupCommunicationsResult,
} from "../communication/contracts.js";
import type {
	ApproveCommunicationBatch,
	ApproveCommunicationBatchArguments,
} from "./approve-communication-batch.js";
import type { CommunicationChecklist } from "./communication-checklist.js";
import type {
	CommunicationDeliveryPreparation,
	CommunicationDeliveryPreparationArguments,
} from "./communication-delivery-preparation.js";
import type { CommunicationDispatchPolicy } from "./communication-dispatch-policy.js";
import type { CommunicationJourneyResults } from "./communication-journey-results.js";
import type { CommunicationPlaceholders } from "./communication-placeholders.js";
import type {
	CompleteCommunicationChecklist,
	CompleteCommunicationChecklistArguments,
} from "./complete-communication-checklist.js";
import type { ManageMeetupCommunicationsDependencies } from "./manage-meetup-communications-contracts.js";
import type { ManageMeetupEventResult } from "./manage-meetup-event-contracts.js";

/** Coordinate event readiness, checklist completion and delivery through owned ports. */
export interface ManageMeetupCommunicationsCollaborators {
	readonly communicationDispatchPolicy: Pick<
		CommunicationDispatchPolicy,
		"isDispatchEnabled"
	>;
	readonly communicationJourneyResults: Pick<
		CommunicationJourneyResults,
		"skippedResult" | "emptyCommunicationResult" | "withRuntimeDiagnostics"
	>;
	readonly eventDocumentConcurrency: Pick<
		EventDocumentConcurrency,
		"eventDocumentsEqual"
	>;
	readonly communicationChecklist: Pick<
		CommunicationChecklist,
		"pendingRecipients"
	>;
	readonly communicationPlaceholders: Pick<
		CommunicationPlaceholders,
		"eventPlaceholders"
	>;
	readonly createCommunicationDeliveryPreparation: (
		...args: CommunicationDeliveryPreparationArguments
	) => CommunicationDeliveryPreparation;
	readonly createApproveCommunicationBatch: (
		...args: ApproveCommunicationBatchArguments
	) => ApproveCommunicationBatch;
	readonly createCompleteCommunicationChecklist: (
		...args: CompleteCommunicationChecklistArguments
	) => CompleteCommunicationChecklist;
}

export class ManageMeetupCommunications {
	constructor(
		private readonly collaborators: ManageMeetupCommunicationsCollaborators,
		private readonly dependencies: ManageMeetupCommunicationsDependencies,
	) {}

	async execute(
		input: ManageMeetupCommunicationsInput,
	): Promise<ManageMeetupCommunicationsResult> {
		const runtimeDiagnostics: CommunicationJourneyDiagnostic[] = [];
		const config = this.dependencies.config;
		const dispatchPermitted =
			this.collaborators.communicationDispatchPolicy.isDispatchEnabled(
				config,
				runtimeDiagnostics,
			);
		const { sourceDocument, managed } = await this.loadEvent(input);

		if (managed.skipped) {
			return this.collaborators.communicationJourneyResults.skippedResult(
				dispatchPermitted,
				runtimeDiagnostics,
			);
		}

		const delivery = await this.collaborators
			.createCommunicationDeliveryPreparation(this.dependencies)
			.execute(managed.event, runtimeDiagnostics);
		const { referencesResolved } = delivery;

		if (
			dispatchPermitted &&
			referencesResolved &&
			!(await this.sourceIsCurrent(sourceDocument, runtimeDiagnostics))
		) {
			return this.collaborators.communicationJourneyResults.emptyCommunicationResult(
				"check",
				runtimeDiagnostics,
			);
		}

		const dispatchEnabled =
			dispatchPermitted &&
			referencesResolved &&
			!runtimeDiagnostics.some(({ severity }) => severity === "error");

		return this.deliver(
			input,
			sourceDocument,
			managed,
			delivery,
			dispatchEnabled,
			runtimeDiagnostics,
		);
	}

	private async deliver(
		input: ManageMeetupCommunicationsInput,
		sourceDocument: EventDocument,
		managed: Exclude<ManageMeetupEventResult, { skipped: true }>,
		delivery: Awaited<ReturnType<CommunicationDeliveryPreparation["execute"]>>,
		dispatchEnabled: boolean,
		runtimeDiagnostics: CommunicationJourneyDiagnostic[],
	): Promise<ManageMeetupCommunicationsResult> {
		const deliveryInput = this.deliveryInput(
			input,
			managed,
			delivery,
			dispatchEnabled,
		);
		const mailApproved =
			dispatchEnabled &&
			(await this.synchronizeApprovals(runtimeDiagnostics)) &&
			(await this.collaborators
				.createApproveCommunicationBatch(
					this.dependencies.organizerApproval,
					this.dependencies.clock,
					this.dependencies.reconcileCommunications(false),
				)
				.execute(
					deliveryInput,
					delivery.mailRecipientResolution.recipients,
					managed.event,
					runtimeDiagnostics,
				));

		if (
			dispatchEnabled &&
			!(await this.sourceIsCurrent(sourceDocument, runtimeDiagnostics))
		) {
			return this.collaborators.communicationJourneyResults.emptyCommunicationResult(
				"check",
				runtimeDiagnostics,
			);
		}

		const reconciliation = await this.dependencies
			.reconcileCommunications(dispatchEnabled)
			.execute({
				...deliveryInput,
				dispatchAuthorized: mailApproved,
			});

		if (dispatchEnabled) {
			await this.collaborators
				.createCompleteCommunicationChecklist(
					this.dependencies.eventRepository,
					this.dependencies.eventDocumentCodec,
				)
				.execute(
					sourceDocument,
					reconciliation.completedMailKinds,
					runtimeDiagnostics,
				);
		}

		return this.collaborators.communicationJourneyResults.withRuntimeDiagnostics(
			reconciliation,
			runtimeDiagnostics,
		);
	}

	private async synchronizeApprovals(
		diagnostics: CommunicationJourneyDiagnostic[],
	): Promise<boolean> {
		try {
			const result = await this.dependencies.organizerApproval.synchronize();
			if (result.notificationFailed)
				diagnostics.push({
					code: "communication.approval-notification-failed",
					severity: "warning",
				});
			return true;
		} catch {
			diagnostics.push({
				code: "communication.approval-unavailable",
				severity: "error",
			});
			return false;
		}
	}

	private async eventSourceIsCurrent(
		repository: EventRepository,
		expected: EventDocument,
		diagnostics: CommunicationJourneyDiagnostic[],
	): Promise<boolean> {
		const current = await repository.find(expected.identity);
		if (
			current &&
			this.collaborators.eventDocumentConcurrency.eventDocumentsEqual(
				current,
				expected,
			)
		)
			return true;
		diagnostics.push({
			code: "communication.event-concurrently-modified",
			severity: "error",
		});
		return false;
	}

	private async loadEvent(input: ManageMeetupCommunicationsInput) {
		const repositoryName = `${input.owner}/${input.repo}`;
		const identity = {
			repository: repositoryName,
			issueNumber: input.issueNumber,
		} as const;
		const sourceDocument =
			await this.dependencies.eventRepository.find(identity);
		if (!sourceDocument) {
			throw new Error(
				`Meetup event ${repositoryName}#${input.issueNumber} was not found`,
			);
		}
		const managed = await this.dependencies.manageEvent.execute({
			identity,
			mode: "check",
			sourceDocument,
		});

		return { identity, sourceDocument, managed };
	}
	private deliveryInput(
		input: ManageMeetupCommunicationsInput,
		managed: Exclude<ManageMeetupEventResult, { skipped: true }>,
		delivery: Awaited<ReturnType<CommunicationDeliveryPreparation["execute"]>>,
		dispatchEnabled: boolean,
	): ReconcileCommunicationsInput {
		const config = this.dependencies.config;
		const repositoryName = `${input.owner}/${input.repo}`;
		return {
			mode: dispatchEnabled ? "dispatch" : "check",
			dispatchAuthorized: false,
			repositoryId: input.repositoryId?.trim() || repositoryName,
			eventId: `issue-${input.issueNumber}`,
			eventDate: managed.event.date,
			timeZone: config.timezone,
			readiness: managed.isReady ? "ready" : "not-ready",
			occurrenceStatus: managed.event.occurrenceStatus ?? "unknown",
			policyVersion: String(config.communication["policy-version"]),
			mailRecipients:
				this.collaborators.communicationChecklist.pendingRecipients(
					managed.event,
					delivery.mailRecipientResolution.recipients,
					delivery.postEvent,
				),
			mailPlaceholders:
				this.collaborators.communicationPlaceholders.eventPlaceholders(
					managed.event,
					input.slidesReady === false ? undefined : input.slidesUrl,
				),
		};
	}

	private sourceIsCurrent(
		source: EventDocument,
		diagnostics: CommunicationJourneyDiagnostic[],
	) {
		return this.eventSourceIsCurrent(
			this.dependencies.eventRepository,
			source,
			diagnostics,
		);
	}
}
export type ManageMeetupCommunicationsArguments =
	ConstructorParameters<typeof ManageMeetupCommunications> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
