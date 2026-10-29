import {
	ATTENTION_STAGE_OWNERS,
	type AttentionStageReport,
	type AttentionStageReports,
	type PublicDiagnostic,
} from "@meetup-automation/journey";
/** Decodes workflow JSON into safe machine facts; no delivery or organizer policy. */
export class AttentionStageInput {
	parse(value: string): AttentionStageReports {
		const input: unknown = JSON.parse(value);
		if (!this.isRecord(input))
			throw new Error("Invalid attention stage results");
		const reports = ATTENTION_STAGE_OWNERS.map(
			(owner) => [owner, this.group(input[owner])] as const,
		);
		return {
			event: reports[0][1],
			assets: reports[1][1],
			feedback: reports[2][1],
			communications: reports[3][1],
			content: reports[4][1],
			...(input.social === undefined
				? {}
				: { social: this.group(input.social) }),
		};
	}
	private group(value: unknown): AttentionStageReport {
		if (!Array.isArray(value)) return this.stage(value);
		if (!value.length) throw new Error("Empty attention stage group");
		const stages = value.map((item) => this.stage(item));
		return {
			outcome: stages.some((stage) => stage.outcome === "failure")
				? "failure"
				: stages.every((stage) => stage.outcome === "success")
					? "success"
					: "unknown",
			reported: stages.every((stage) => stage.reported),
			diagnostics: stages.flatMap((stage) => stage.diagnostics),
		};
	}
	private stage(value: unknown): AttentionStageReport {
		if (value !== undefined && !this.isRecord(value))
			throw new Error("Invalid attention stage");
		const stage = value ?? {};
		return {
			outcome:
				stage.outcome === "success" || stage.outcome === "failure"
					? stage.outcome
					: "unknown",
			diagnostics: this.readDiagnostics(stage.diagnostics),
			reported:
				stage.diagnostics !== undefined &&
				stage.diagnostics !== null &&
				stage.diagnostics !== "",
		};
	}
	private isRecord(value: unknown): value is Record<string, unknown> {
		return typeof value === "object" && value !== null && !Array.isArray(value);
	}
	private readDiagnostics(input: unknown): readonly PublicDiagnostic[] {
		if (input === undefined || input === null) return [];
		let diagnostics = input;
		if (typeof diagnostics === "string") {
			if (!diagnostics) return [];
			try {
				diagnostics = JSON.parse(diagnostics);
			} catch {
				throw new Error("Invalid attention stage diagnostics");
			}
		}
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
				...(this.safeField(field) ? { field } : {}),
				...(typeof fixApplied === "boolean" ? { fixApplied } : {}),
			};
		});
	}

	private safeField(field: unknown): field is string {
		if (typeof field !== "string" || field.length > 160) return false;
		return (
			/^social\.[a-z0-9][a-z0-9-]{0,63}\.(announcement|d7|d0)$/.test(field) ||
			["Aperitif", "Restaurant / Bar"].includes(field) ||
			/^(agenda|assets|date|description|host|hoster|hosts|speakers|title|name|labels|confirmations|event_status|occurrenceStatus|publicationLinks)(?:\[\d{1,6}\]|\.(?:[a-zA-Z][a-zA-Z-]{0,40}|\d{1,6}))*$/.test(
				field,
			)
		);
	}
}
