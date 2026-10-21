import {
	ATTENTION_STAGE_OWNERS,
	type AttentionStageReport,
	type AttentionStageReports,
	type PublicDiagnostic,
} from "@meetup-automation/journey";
/** Decodes workflow JSON into safe machine facts; no delivery or organizer policy. */
export class AttentionStageInput {
	static parse(value: string): AttentionStageReports {
		const input: unknown = JSON.parse(value);
		if (!AttentionStageInput.isRecord(input))
			throw new Error("Invalid attention stage results");
		const reports = ATTENTION_STAGE_OWNERS.map(
			(owner) => [owner, AttentionStageInput.stage(input[owner])] as const,
		);
		return {
			event: reports[0][1],
			assets: reports[1][1],
			feedback: reports[2][1],
			communications: reports[3][1],
		};
	}
	private static stage(value: unknown): AttentionStageReport {
		if (value !== undefined && !AttentionStageInput.isRecord(value))
			throw new Error("Invalid attention stage");
		const stage = value ?? {};
		return {
			outcome:
				stage.outcome === "success" || stage.outcome === "failure"
					? stage.outcome
					: "unknown",
			diagnostics: AttentionStageInput.readDiagnostics(stage.diagnostics),
			reported: stage.diagnostics !== undefined && stage.diagnostics !== "",
		};
	}
	private static isRecord(value: unknown): value is Record<string, unknown> {
		return typeof value === "object" && value !== null && !Array.isArray(value);
	}
	private static readDiagnostics(input: unknown): readonly PublicDiagnostic[] {
		let diagnostics = input;
		if (typeof diagnostics === "string") {
			if (!diagnostics) return [];
			try {
				diagnostics = JSON.parse(diagnostics);
			} catch {
				throw new Error("Invalid attention stage diagnostics");
			}
		}
		if (diagnostics === undefined) return [];
		if (!Array.isArray(diagnostics))
			throw new Error("Invalid attention stage diagnostics");
		return diagnostics.map((item: unknown) => {
			if (!item || typeof item !== "object" || Array.isArray(item))
				throw new Error("Invalid attention stage diagnostic");
			const { code, severity, field, fixApplied } = item as Record<
				string,
				unknown
			>;
			if (
				typeof code !== "string" ||
				!/^(event|publication|communication|referential|action)\.[a-z.-]{1,120}$/.test(
					code,
				) ||
				(severity !== "error" && severity !== "warning" && severity !== "info")
			)
				throw new Error("Invalid attention stage diagnostic");
			return {
				code,
				severity,
				message: code,
				...(AttentionStageInput.safeField(field) ? { field } : {}),
				...(typeof fixApplied === "boolean" ? { fixApplied } : {}),
			};
		});
	}

	private static safeField(field: unknown): field is string {
		if (typeof field !== "string" || field.length > 160) return false;
		return (
			["Aperitif", "Restaurant / Bar"].includes(field) ||
			/^(agenda|assets|date|description|host|hoster|hosts|speakers|title|name|labels|confirmations|event_status|occurrenceStatus|publicationLinks)(?:\[\d{1,6}\]|\.(?:[a-zA-Z][a-zA-Z-]{0,40}|\d{1,6}))*$/.test(
				field,
			)
		);
	}
}
