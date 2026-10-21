import type { EventDiagnostic } from "@meetup-automation/event";
import type { PublicDiagnostic } from "../result/result-envelope.js";

export class EventDiagnosticProjection {
	toEventDiagnostic(
		code: string,
		severity: "error" | "warning",
		field: string,
		message: string,
	): EventDiagnostic {
		return {
			code,
			severity,
			category: severity === "error" ? "invalid" : "migration",
			field,
			message,
		};
	}

	toPublicDiagnostic(item: EventDiagnostic): PublicDiagnostic {
		return {
			code: item.code,
			severity: item.severity,
			field: item.field,
			message: item.message,
			fixApplied: false,
		};
	}
}
