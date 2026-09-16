import type { EventDiagnostic } from "@meetup-automation/event";
import type { PublicDiagnostic } from "../result/result-envelope.js";

export class EventDiagnosticProjection {
	static toEventDiagnostic(
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

	static toPublicDiagnostic(item: EventDiagnostic): PublicDiagnostic {
		return {
			code: item.code,
			severity: item.severity,
			field: item.field,
			message: item.message,
			fixApplied: false,
		};
	}
}
