import type { ReconcileCommunicationsResult } from "@meetup-automation/communication";
import type {
	CommunicationJourneyDiagnostic,
	ManageMeetupCommunicationsResult,
} from "../communication/contracts.js";

export class CommunicationJourneyResults {
	withRuntimeDiagnostics(
		result: ReconcileCommunicationsResult,
		runtimeDiagnostics: readonly CommunicationJourneyDiagnostic[],
	): ManageMeetupCommunicationsResult {
		return {
			...result,
			runtimeDiagnostics: Object.freeze([...runtimeDiagnostics]),
		};
	}
	emptyCommunicationResult(
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
	skippedResult(
		dispatchPermitted: boolean,
		runtimeDiagnostics: CommunicationJourneyDiagnostic[],
	) {
		runtimeDiagnostics.push({
			code: "communication.event-skipped",
			severity: "info",
		});
		return this.emptyCommunicationResult(
			dispatchPermitted ? "dispatch" : "check",
			runtimeDiagnostics,
		);
	}
}
