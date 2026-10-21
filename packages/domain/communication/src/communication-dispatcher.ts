import type {
	CommunicationResults,
	MutableCounts,
} from "./communication-results.js";
import type {
	CommunicationDiagnostic,
	CommunicationIntent,
	GatewayDispatchResult,
} from "./model.js";
import type { DeliveryLedger, MailGateway } from "./ports.js";
export interface CommunicationDispatcherCollaborators {
	readonly communicationResults: Pick<CommunicationResults, "safeDetailCode">;
}

export class CommunicationDispatcher {
	readonly #ledger: DeliveryLedger;
	readonly #mailGateway: MailGateway;
	constructor(
		private readonly collaborators: CommunicationDispatcherCollaborators,
		ledger: DeliveryLedger,
		mailGateway: MailGateway,
	) {
		this.#ledger = ledger;
		this.#mailGateway = mailGateway;
	}
	async execute(
		intent: CommunicationIntent,
		timestamp: string,
		counts: MutableCounts,
		diagnostics: CommunicationDiagnostic[],
	): Promise<boolean> {
		let dispatchResult: GatewayDispatchResult;
		try {
			dispatchResult = await this.#mailGateway.dispatch(intent);
		} catch {
			counts.uncertain += 1;
			diagnostics.push({
				code: "gateway-threw-ambiguous-error",
				severity: "error",
				intentId: intent.intentId,
			});
			await this.#markUncertain(
				intent,
				timestamp,
				"gateway-threw-ambiguous-error",
				diagnostics,
			);
			return false;
		}

		if (dispatchResult.outcome === "deferred") {
			await this.defer(intent, dispatchResult, counts, diagnostics);
			return false;
		}

		if (dispatchResult.outcome === "rejected") {
			counts.rejected += 1;
			diagnostics.push({
				code: "gateway-delivery-rejected",
				severity: "error",
				intentId: intent.intentId,
				detailCode: dispatchResult.diagnosticCode,
			});
			try {
				await this.#ledger.markRejected(
					intent.idempotencyKey,
					timestamp,
					dispatchResult.diagnosticCode,
				);
			} catch {
				diagnostics.push({
					code: "ledger-status-write-failed",
					severity: "error",
					intentId: intent.intentId,
				});
			}
			return false;
		}

		if (dispatchResult.outcome === "uncertain") {
			const detailCode = this.collaborators.communicationResults.safeDetailCode(
				dispatchResult.diagnosticCode,
			);
			counts.uncertain += 1;
			diagnostics.push({
				code: "gateway-delivery-uncertain",
				severity: "error",
				intentId: intent.intentId,
				...(detailCode ? { detailCode } : {}),
			});
			await this.#markUncertain(
				intent,
				timestamp,
				detailCode ?? "gateway-delivery-uncertain",
				diagnostics,
			);
			return false;
		}

		return this.accept(intent, timestamp, counts, diagnostics);
	}

	async #markUncertain(
		intent: CommunicationIntent,
		timestamp: string,
		diagnosticCode: string,
		diagnostics: CommunicationDiagnostic[],
	): Promise<void> {
		try {
			await this.#ledger.markUncertain(
				intent.idempotencyKey,
				timestamp,
				diagnosticCode,
			);
		} catch {
			diagnostics.push({
				code: "ledger-status-write-failed",
				severity: "error",
				intentId: intent.intentId,
			});
		}
	}

	private async defer(
		intent: CommunicationIntent,
		dispatchResult: Extract<GatewayDispatchResult, { outcome: "deferred" }>,
		counts: MutableCounts,
		diagnostics: CommunicationDiagnostic[],
	) {
		counts.deferred += 1;
		diagnostics.push({
			code: "gateway-delivery-deferred",
			severity: "warning",
			intentId: intent.intentId,
			detailCode: dispatchResult.diagnosticCode,
		});
		try {
			await this.#ledger.releasePending(intent.idempotencyKey);
		} catch {
			diagnostics.push({
				code: "ledger-status-write-failed",
				severity: "error",
				intentId: intent.intentId,
			});
		}
		return;
	}

	private async accept(
		intent: CommunicationIntent,
		timestamp: string,
		counts: MutableCounts,
		diagnostics: CommunicationDiagnostic[],
	) {
		counts.accepted += 1;
		try {
			await this.#ledger.markAccepted(intent.idempotencyKey, timestamp);
			return true;
		} catch {
			diagnostics.push({
				code: "ledger-status-write-failed",
				severity: "error",
				intentId: intent.intentId,
			});
		}
		return false;
	}
}
export type CommunicationDispatcherArguments =
	ConstructorParameters<typeof CommunicationDispatcher> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
