import type { CommunicationCalendar } from "./communication-calendar.js";
import type {
	CommunicationDispatcher,
	CommunicationDispatcherArguments,
} from "./communication-dispatcher.js";
import type {
	CommunicationResults,
	MutableCounts,
} from "./communication-results.js";
import type {
	CommunicationDiagnostic,
	CommunicationIntent,
	DeliveryLedgerEntry,
	ReconcileCommunicationsInput,
	ReconcileCommunicationsResult,
} from "./model.js";
import type { PlanCommunications } from "./plan-communications.js";
import type {
	CommunicationClock,
	DeliveryLedger,
	MailGateway,
} from "./ports.js";

export type ReconcileCommunicationsDependencies = {
	readonly planner: PlanCommunications;
	readonly clock: CommunicationClock;
	readonly ledger: DeliveryLedger;
	readonly mailGateway: MailGateway;
};

export interface ReconcileCommunicationsCollaborators {
	readonly communicationResults: Pick<
		CommunicationResults,
		"emptyResult" | "result" | "recordExisting"
	>;
	readonly communicationCalendar: Pick<CommunicationCalendar, "isValidInstant">;
	readonly createCommunicationDispatcher: (
		...args: CommunicationDispatcherArguments
	) => CommunicationDispatcher;
}

export class ReconcileCommunications {
	readonly #planner: PlanCommunications;
	readonly #clock: CommunicationClock;
	readonly #ledger: DeliveryLedger;
	readonly #dispatcher: CommunicationDispatcher;

	constructor(
		private readonly collaborators: ReconcileCommunicationsCollaborators,
		dependencies: ReconcileCommunicationsDependencies,
	) {
		this.#planner = dependencies.planner;
		this.#clock = dependencies.clock;
		this.#ledger = dependencies.ledger;
		this.#dispatcher = this.collaborators.createCommunicationDispatcher(
			dependencies.ledger,
			dependencies.mailGateway,
		);
	}

	async execute(
		input: ReconcileCommunicationsInput,
	): Promise<ReconcileCommunicationsResult> {
		let now: Date;
		try {
			now = this.#clock.now();
		} catch {
			return this.collaborators.communicationResults.emptyResult(input.mode, {
				code: "invalid-clock",
				severity: "error",
			});
		}
		if (!this.collaborators.communicationCalendar.isValidInstant(now)) {
			return this.collaborators.communicationResults.emptyResult(input.mode, {
				code: "invalid-clock",
				severity: "error",
			});
		}

		const { mode, dispatchAuthorized, ...planningInput } = input;
		const plan = this.#planner.execute({ ...planningInput, now });
		const diagnostics = [...plan.diagnostics];
		const counts: MutableCounts = {
			planned: plan.intents.length,
			due: 0,
			alreadyRecorded: 0,
			reserved: 0,
			dispatched: 0,
			accepted: 0,
			uncertain: 0,
			rejected: 0,
			deferred: 0,
		};

		const timestamp = now.toISOString();
		const acceptedIds = new Set<string>();

		for (const intent of plan.intents) {
			const accepted = await this.processIntent(
				intent,
				timestamp,
				mode,
				dispatchAuthorized,
				counts,
				diagnostics,
			);
			if (accepted) acceptedIds.add(intent.intentId);
		}

		return this.collaborators.communicationResults.result(
			mode,
			plan.intents,
			counts,
			diagnostics,
			acceptedIds,
		);
	}

	async #findExisting(
		intent: CommunicationIntent,
		diagnostics: CommunicationDiagnostic[],
	): Promise<DeliveryLedgerEntry | undefined | "read-failed"> {
		try {
			return await this.#ledger.find(intent.idempotencyKey);
		} catch {
			diagnostics.push({
				code: "ledger-read-failed",
				severity: "error",
				intentId: intent.intentId,
			});
			return "read-failed";
		}
	}

	async #reserve(
		intent: CommunicationIntent,
		timestamp: string,
		diagnostics: CommunicationDiagnostic[],
	) {
		try {
			return await this.#ledger.reservePending({
				idempotencyKey: intent.idempotencyKey,
				intentId: intent.intentId,
				repositoryId: intent.repositoryId,
				eventId: intent.eventId,
				kind: intent.kind,
				recipientId: intent.recipientId,
				policyVersion: intent.policyVersion,
				reservedAt: timestamp,
			});
		} catch {
			diagnostics.push({
				code: "ledger-reservation-failed",
				severity: "error",
				intentId: intent.intentId,
			});
			return "reservation-failed" as const;
		}
	}

	private async processIntent(
		intent: CommunicationIntent,
		timestamp: string,
		mode: ReconcileCommunicationsInput["mode"],
		dispatchAuthorized: boolean,
		counts: MutableCounts,
		diagnostics: CommunicationDiagnostic[],
	) {
		const existing = await this.#findExisting(intent, diagnostics);
		if (existing === "read-failed") {
			return;
		}

		if (existing) {
			this.collaborators.communicationResults.recordExisting(
				intent.intentId,
				existing,
				counts,
				diagnostics,
			);
			return existing.status === "accepted";
		}

		counts.due += 1;
		if (mode === "check") {
			return;
		}
		if (!dispatchAuthorized) {
			return;
		}

		const reservation = await this.#reserve(intent, timestamp, diagnostics);
		if (reservation === "reservation-failed") {
			return;
		}

		if (!reservation.reserved) {
			this.collaborators.communicationResults.recordExisting(
				intent.intentId,
				reservation.entry,
				counts,
				diagnostics,
			);
			return reservation.entry.status === "accepted";
		}

		counts.reserved += 1;
		counts.dispatched += 1;
		return this.#dispatcher.execute(intent, timestamp, counts, diagnostics);
	}
}
export type ReconcileCommunicationsArguments =
	ConstructorParameters<typeof ReconcileCommunications> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
