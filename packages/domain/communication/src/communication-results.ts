import type {
	CommunicationDiagnostic,
	CommunicationIntent,
	DeliveryLedgerEntry,
	ReconcileCommunicationCounts,
	ReconcileCommunicationsInput,
	ReconcileCommunicationsResult,
} from "./model.js";
export type MutableCounts = {
	-readonly [Key in keyof ReconcileCommunicationCounts]: ReconcileCommunicationCounts[Key];
};
export class CommunicationResults {
	static recordExisting(
		intentId: string,
		entry: DeliveryLedgerEntry,
		counts: MutableCounts,
		diagnostics: CommunicationDiagnostic[],
	): void {
		counts.alreadyRecorded += 1;
		diagnostics.push({
			code: "delivery-already-recorded",
			severity: "info",
			intentId,
			deliveryStatus: entry.status,
		});
	}

	static result(
		mode: ReconcileCommunicationsInput["mode"],
		intents: readonly CommunicationIntent[],
		counts: ReconcileCommunicationCounts,
		diagnostics: readonly CommunicationDiagnostic[],
	): ReconcileCommunicationsResult {
		return {
			mode,
			intentIds: intents.map((intent) => intent.intentId),
			counts: { ...counts },
			diagnostics: [...diagnostics],
		};
	}

	static emptyResult(
		mode: ReconcileCommunicationsInput["mode"],
		diagnostic: CommunicationDiagnostic,
	): ReconcileCommunicationsResult {
		return {
			mode,
			intentIds: [],
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
			diagnostics: [diagnostic],
		};
	}

	static isValidInstant(value: Date): boolean {
		return value instanceof Date && Number.isFinite(value.getTime());
	}

	static safeDetailCode(value: string | undefined): string | undefined {
		return [
			"ambiguous-response",
			"connection-reset",
			"provider-timeout",
			"unknown-provider-state",
		].includes(value ?? "")
			? value
			: undefined;
	}
}
