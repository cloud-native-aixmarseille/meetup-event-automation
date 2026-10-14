import type {
	CommunicationDiagnostic,
	CommunicationIntent,
	DeliveryLedgerEntry,
	MailCommunicationKind,
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
		acceptedIds: ReadonlySet<string>,
	): ReconcileCommunicationsResult {
		return {
			mode,
			intentIds: intents.map((intent) => intent.intentId),
			completedMailKinds: CommunicationResults.completedMailKinds(
				intents,
				acceptedIds,
			),
			counts: { ...counts },
			diagnostics: [...diagnostics],
		};
	}

	static completedMailKinds(
		intents: readonly CommunicationIntent[],
		acceptedIds: ReadonlySet<string>,
	): readonly MailCommunicationKind[] {
		const groups = new Map<MailCommunicationKind, boolean>();
		for (const intent of intents) {
			if (intent.channel !== "mail" || intent.kind === "readiness-reminder")
				continue;
			groups.set(
				intent.kind,
				(groups.get(intent.kind) ?? true) && acceptedIds.has(intent.intentId),
			);
		}
		return [...groups].filter(([, accepted]) => accepted).map(([kind]) => kind);
	}

	static emptyResult(
		mode: ReconcileCommunicationsInput["mode"],
		diagnostic: CommunicationDiagnostic,
	): ReconcileCommunicationsResult {
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
