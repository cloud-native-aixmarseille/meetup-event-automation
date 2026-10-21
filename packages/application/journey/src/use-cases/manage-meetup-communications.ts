import type {
	ReconcileCommunicationsInput,
	ReconcileCommunicationsResult,
} from "@meetup-automation/communication";
import {
	type EventDocument,
	type EventRepository,
	ReconcileEvent,
} from "@meetup-automation/event";
import type {
	CommunicationJourneyDiagnostic,
	ManageMeetupCommunicationsInput,
	ManageMeetupCommunicationsResult,
} from "../communication/contracts.js";
import type { AutomationConfig } from "../config/automation-config.js";
import { ApproveCommunicationBatch } from "./approve-communication-batch.js";
import { CommunicationChecklist } from "./communication-checklist.js";
import { CommunicationDeliveryPreparation } from "./communication-delivery-preparation.js";
import { CommunicationPlaceholders } from "./communication-placeholders.js";
import { CompleteCommunicationChecklist } from "./complete-communication-checklist.js";
import type { ManageMeetupCommunicationsDependencies } from "./manage-meetup-communications-contracts.js";
import type { ManageMeetupEventResult } from "./manage-meetup-event-contracts.js";

/** Coordinate event readiness, checklist completion and delivery through owned ports. */
export class ManageMeetupCommunications {
	constructor(
		private readonly dependencies: ManageMeetupCommunicationsDependencies,
	) {}

	async execute(
		input: ManageMeetupCommunicationsInput,
	): Promise<ManageMeetupCommunicationsResult> {
		const runtimeDiagnostics: CommunicationJourneyDiagnostic[] = [];
		const config = this.dependencies.config;
		const dispatchPermitted = ManageMeetupCommunications.isDispatchEnabled(
			config,
			runtimeDiagnostics,
		);
		const { sourceDocument, managed } = await this.loadEvent(input);

		if (managed.skipped) {
			return ManageMeetupCommunications.skippedResult(
				dispatchPermitted,
				runtimeDiagnostics,
			);
		}

		const delivery = await new CommunicationDeliveryPreparation(
			this.dependencies,
		).execute(managed.event, runtimeDiagnostics);
		const { referencesResolved } = delivery;

		if (
			dispatchPermitted &&
			referencesResolved &&
			!(await this.sourceIsCurrent(sourceDocument, runtimeDiagnostics))
		) {
			return ManageMeetupCommunications.emptyCommunicationResult(
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
			(await new ApproveCommunicationBatch(
				this.dependencies.organizerApproval,
				this.dependencies.clock,
				this.dependencies.reconcileCommunications(false),
			).execute(
				deliveryInput,
				delivery.mailRecipientResolution.recipients,
				managed.event,
				runtimeDiagnostics,
			));

		if (
			dispatchEnabled &&
			!(await this.sourceIsCurrent(sourceDocument, runtimeDiagnostics))
		) {
			return ManageMeetupCommunications.emptyCommunicationResult(
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
			await new CompleteCommunicationChecklist(
				this.dependencies.eventRepository,
				this.dependencies.eventDocumentCodec,
			).execute(
				sourceDocument,
				reconciliation.completedMailKinds,
				runtimeDiagnostics,
			);
		}

		return ManageMeetupCommunications.withRuntimeDiagnostics(
			reconciliation,
			runtimeDiagnostics,
		);
	}

	static isDispatchEnabled(
		config: AutomationConfig,
		diagnostics: CommunicationJourneyDiagnostic[],
	): boolean {
		const enabledByConfig = config.communication["dispatch-enabled"];
		if (!enabledByConfig) {
			diagnostics.push({
				code: "communication.dispatch-disabled-by-config",
				severity: "warning",
			});
		}
		return enabledByConfig;
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

	private static async eventSourceIsCurrent(
		repository: EventRepository,
		expected: EventDocument,
		diagnostics: CommunicationJourneyDiagnostic[],
	): Promise<boolean> {
		const current = await repository.find(expected.identity);
		if (current && ReconcileEvent.eventDocumentsEqual(current, expected))
			return true;
		diagnostics.push({
			code: "communication.event-concurrently-modified",
			severity: "error",
		});
		return false;
	}

	private static withRuntimeDiagnostics(
		result: ReconcileCommunicationsResult,
		runtimeDiagnostics: readonly CommunicationJourneyDiagnostic[],
	): ManageMeetupCommunicationsResult {
		return {
			...result,
			runtimeDiagnostics: Object.freeze([...runtimeDiagnostics]),
		};
	}

	static emptyCommunicationResult(
		mode: "check" | "dispatch",
		runtimeDiagnostics: readonly CommunicationJourneyDiagnostic[],
	): ManageMeetupCommunicationsResult {
		return {
			mode,
			intentIds: [],
			completedMailKinds: [],
			counts: {
				planned: 0,
				due: 0,
				alreadyRecorded: 0,
				reserved: 0,
				dispatched: 0,
				accepted: 0,
				uncertain: 0,
				rejected: 0,
				deferred: 0,
			},
			diagnostics: [],
			runtimeDiagnostics: Object.freeze([...runtimeDiagnostics]),
		};
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
			mailRecipients: CommunicationChecklist.pendingRecipients(
				managed.event,
				delivery.mailRecipientResolution.recipients,
				delivery.postEvent,
			),
			mailPlaceholders: CommunicationPlaceholders.eventPlaceholders(
				managed.event,
				input.slidesReady === false ? undefined : input.slidesUrl,
			),
		};
	}

	private sourceIsCurrent(
		source: EventDocument,
		diagnostics: CommunicationJourneyDiagnostic[],
	) {
		return ManageMeetupCommunications.eventSourceIsCurrent(
			this.dependencies.eventRepository,
			source,
			diagnostics,
		);
	}

	private static skippedResult(
		dispatchPermitted: boolean,
		runtimeDiagnostics: CommunicationJourneyDiagnostic[],
	) {
		runtimeDiagnostics.push({
			code: "communication.event-skipped",
			severity: "info",
		});
		return ManageMeetupCommunications.emptyCommunicationResult(
			dispatchPermitted ? "dispatch" : "check",
			runtimeDiagnostics,
		);
	}
}
