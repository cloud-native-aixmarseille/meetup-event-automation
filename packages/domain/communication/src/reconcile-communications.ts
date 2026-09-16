import { CommunicationDispatcher } from "./communication-dispatcher.js";
import {
	CommunicationResults,
	type MutableCounts,
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
	NotificationGateway,
} from "./ports.js";

export type ReconcileCommunicationsDependencies = {
	readonly planner: PlanCommunications;
	readonly clock: CommunicationClock;
	readonly ledger: DeliveryLedger;
	readonly mailGateway: MailGateway;
	readonly notificationGateway: NotificationGateway;
};

export class ReconcileCommunications {
	readonly #planner: PlanCommunications;
	readonly #clock: CommunicationClock;
	readonly #ledger: DeliveryLedger;
	readonly #dispatcher: CommunicationDispatcher;

	constructor(dependencies: ReconcileCommunicationsDependencies) {
		this.#planner = dependencies.planner;
		this.#clock = dependencies.clock;
		this.#ledger = dependencies.ledger;
		this.#dispatcher = new CommunicationDispatcher(
			dependencies.ledger,
			dependencies.mailGateway,
			dependencies.notificationGateway,
		);
	}

	async execute(
		input: ReconcileCommunicationsInput,
	): Promise<ReconcileCommunicationsResult> {
		let now: Date;
		try {
			now = this.#clock.now();
		} catch {
			return CommunicationResults.emptyResult(input.mode, {
				code: "invalid-clock",
				severity: "error",
			});
		}
		if (!CommunicationResults.isValidInstant(now)) {
			return CommunicationResults.emptyResult(input.mode, {
				code: "invalid-clock",
				severity: "error",
			});
		}

		const {
			mode,
			dispatchCapabilities = DEFAULT_DISPATCH_CAPABILITIES,
			...planningInput
		} = input;
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

		for (const intent of plan.intents) {
			await this.processIntent(
				intent,
				timestamp,
				mode,
				dispatchCapabilities,
				counts,
				diagnostics,
			);
		}

		return CommunicationResults.result(mode, plan.intents, counts, diagnostics);
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
		dispatchCapabilities: NonNullable<
			ReconcileCommunicationsInput["dispatchCapabilities"]
		>,
		counts: MutableCounts,
		diagnostics: CommunicationDiagnostic[],
	) {
		const existing = await this.#findExisting(intent, diagnostics);
		if (existing === "read-failed") {
			return;
		}

		if (existing) {
			CommunicationResults.recordExisting(
				intent.intentId,
				existing,
				counts,
				diagnostics,
			);
			return;
		}

		counts.due += 1;
		if (mode === "check") {
			return;
		}
		if (!dispatchCapabilities[intent.channel]) {
			return;
		}

		const reservation = await this.#reserve(intent, timestamp, diagnostics);
		if (reservation === "reservation-failed") {
			return;
		}

		if (!reservation.reserved) {
			CommunicationResults.recordExisting(
				intent.intentId,
				reservation.entry,
				counts,
				diagnostics,
			);
			return;
		}

		counts.reserved += 1;
		counts.dispatched += 1;
		await this.#dispatcher.execute(intent, timestamp, counts, diagnostics);
	}
}

const DEFAULT_DISPATCH_CAPABILITIES = Object.freeze({
	mail: true,
	notification: true,
});
