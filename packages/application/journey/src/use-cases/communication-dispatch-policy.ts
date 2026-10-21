import type { CommunicationJourneyDiagnostic } from "../communication/contracts.js";
import type { AutomationConfig } from "../config/automation-config.js";

export class CommunicationDispatchPolicy {
	isDispatchEnabled(
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
}
