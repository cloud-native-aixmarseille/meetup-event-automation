import {
	ATTENTION_STAGE_OWNERS,
	type AttentionStageReport,
	type AttentionStageReports,
	type PublicDiagnostic,
} from "@meetup-automation/journey";
import { RuntimeInputError } from "./runtime-input-error.js";
/** Decodes workflow JSON into safe machine facts; no delivery or organizer policy. */
export class AttentionStageInput {
	parse(value: string): AttentionStageReports {
		const input = this.json(value, "stage-results");
		if (!this.isRecord(input))
			throw new RuntimeInputError("stage-results", "must be an object");
		const reports = ATTENTION_STAGE_OWNERS.map(
			(owner) =>
				[owner, this.group(input[owner], `stage-results.${owner}`)] as const,
		);
		return {
			event: reports[0][1],
			assets: reports[1][1],
			feedback: reports[2][1],
			communications: reports[3][1],
			content: reports[4][1],
			...(input.social === undefined
				? {}
				: { social: this.group(input.social, "stage-results.social") }),
		};
	}
	private group(value: unknown, field: string): AttentionStageReport {
		if (!Array.isArray(value)) return this.stage(value, field);
		if (!value.length)
			throw new RuntimeInputError(field, "must not be an empty group");
		const stages = value.map((item, index) =>
			this.stage(item, `${field}[${index}]`),
		);
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
	private stage(value: unknown, field: string): AttentionStageReport {
		if (value !== undefined && !this.isRecord(value))
			throw new RuntimeInputError(field, "must be an object");
		const stage = value ?? {};
		return {
			outcome:
				stage.outcome === "success" || stage.outcome === "failure"
					? stage.outcome
					: "unknown",
			diagnostics: this.readDiagnostics(
				stage.diagnostics,
				`${field}.diagnostics`,
			),
			reported:
				stage.diagnostics !== undefined &&
				stage.diagnostics !== null &&
				stage.diagnostics !== "",
		};
	}
	private isRecord(value: unknown): value is Record<string, unknown> {
		return typeof value === "object" && value !== null && !Array.isArray(value);
	}
	private json(value: string, field: string): unknown {
		try {
			return JSON.parse(value);
		} catch {
			throw new RuntimeInputError(field, "must contain valid JSON");
		}
	}
	private readDiagnostics(
		input: unknown,
		path: string,
	): readonly PublicDiagnostic[] {
		if (input === undefined || input === null) return [];
		let diagnostics: unknown = input;
		if (typeof diagnostics === "string") {
			if (!diagnostics) return [];
			diagnostics = this.json(diagnostics, path);
		}
		if (!Array.isArray(diagnostics))
			throw new RuntimeInputError(path, "must be an array");
		return diagnostics.map((item: unknown, index) => {
			if (!item || typeof item !== "object" || Array.isArray(item))
				throw new RuntimeInputError(`${path}[${index}]`, "must be an object");
			const { code, severity, field, fixApplied } = item as Record<
				string,
				unknown
			>;
			if (
				typeof code !== "string" ||
				!/^(event|publication|communication|referential|action)\.[a-z.-]{1,120}$/.test(
					code,
				)
			)
				throw new RuntimeInputError(
					`${path}[${index}].code`,
					"must be a supported diagnostic code",
				);
			if (severity !== "error" && severity !== "warning" && severity !== "info")
				throw new RuntimeInputError(
					`${path}[${index}].severity`,
					"must be error, warning or info",
				);
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
