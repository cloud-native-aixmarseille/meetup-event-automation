import type { AttentionStage } from "@meetup-automation/communication";
import {
	DiagnosticPolicy,
	type PublicDiagnostic,
} from "@meetup-automation/journey";

const OWNERS = ["event", "assets", "feedback", "communications"] as const;
type StageInput = Record<
	string,
	{ outcome?: unknown; diagnostics?: unknown } | undefined
>;

/** Workflow status and organizer work share one diagnostic classification. */
export class AttentionStages {
	static parse(value: string): readonly AttentionStage[] {
		const input = AttentionStages.input(value);
		const eventDiagnostics = AttentionStages.readDiagnostics(
			input.event?.diagnostics,
		);
		return OWNERS.map((owner) => {
			const stage = input[owner];
			const outcome: AttentionStage["outcome"] =
				stage?.outcome === "success" || stage?.outcome === "failure"
					? stage.outcome
					: "unknown";
			const diagnostics = AttentionStages.readDiagnostics(stage?.diagnostics);
			const blocked = diagnostics.some(
				(item) =>
					DiagnosticPolicy.isTechnicalFailure(item) &&
					!AttentionStages.eventPrerequisite(
						item.code,
						owner,
						eventDiagnostics,
					),
			);
			const prerequisiteBlocked =
				outcome !== "unknown" &&
				!blocked &&
				diagnostics.some(
					(item) =>
						AttentionStages.organizerPrerequisite(item) ||
						AttentionStages.eventPrerequisite(
							item.code,
							owner,
							eventDiagnostics,
						),
				);
			return {
				owner,
				outcome,
				blocked,
				...(prerequisiteBlocked ? { prerequisiteBlocked: true } : {}),
			};
		});
	}

	/** Only machine identifiers cross into the organizer presentation boundary. */
	static diagnostics(value: string): readonly PublicDiagnostic[] {
		const input = AttentionStages.input(value);
		const diagnostics = new Map<string, PublicDiagnostic>();
		for (const owner of OWNERS) {
			for (const item of AttentionStages.readDiagnostics(
				input[owner]?.diagnostics,
			))
				diagnostics.set(
					`${item.code}:${item.field ?? ""}:${item.severity}`,
					item,
				);
		}
		const merged = [...diagnostics.values()];
		return merged.filter(
			(item) =>
				!["action.execution.failed", "event.concurrently-modified"].includes(
					item.code,
				) && !AttentionStages.derivative(item, merged),
		);
	}

	static hasCompleteReports(value: string): boolean {
		const input = AttentionStages.input(value);
		return OWNERS.every((owner) => {
			const stage = input[owner];
			if (
				stage?.outcome !== "success" ||
				stage.diagnostics === undefined ||
				stage.diagnostics === ""
			)
				return false;
			return !AttentionStages.readDiagnostics(stage.diagnostics).some(
				(item) =>
					DiagnosticPolicy.isTechnicalFailure(item) ||
					item.code === "event.concurrently-modified",
			);
		});
	}

	private static input(value: string): StageInput {
		const input: unknown = JSON.parse(value);
		if (!input || typeof input !== "object" || Array.isArray(input))
			throw new Error("Invalid attention stage results");
		return input as StageInput;
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
				!["error", "warning", "info"].includes(String(severity))
			)
				throw new Error("Invalid attention stage diagnostic");
			return {
				code,
				severity: severity as PublicDiagnostic["severity"],
				message: code,
				...(AttentionStages.safeField(field) ? { field } : {}),
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

	private static organizerPrerequisite(item: PublicDiagnostic): boolean {
		if (item.code === "event.concurrently-modified") return true;
		return (
			DiagnosticPolicy.classify(item) === "organizer" &&
			![
				"communication.approval-pending",
				"communication.approval-rejected",
			].includes(item.code)
		);
	}

	private static derivative(
		item: PublicDiagnostic,
		diagnostics: readonly PublicDiagnostic[],
	): boolean {
		const roots: Readonly<Record<string, RegExp>> = {
			"communication.event-references-unresolved":
				/^(event\.(proposals\.|agenda\.|hoster\.|document\.reference-metadata\.)|referential\.)/,
			"communication.referential-catalog-invalid": /^referential\./,
			"communication.slides-unavailable": /^publication\.assets\.content\./,
			"communication.feedback-unavailable":
				/^(publication\.feedback\.(agenda|prerequisites|conflict)|event\.link\.feedback\.invalid)$/,
			"publication.feedback.agenda": /^event\.(agenda\.|proposals\.)/,
			"publication.assets.prerequisites": /^event\.(date\.|hoster\.)/,
		};
		const root = roots[item.code];
		return (
			root !== undefined &&
			diagnostics.some(
				(candidate) =>
					root.test(candidate.code) &&
					DiagnosticPolicy.classify(candidate) !== "informational",
			)
		);
	}

	private static eventPrerequisite(
		code: string,
		owner: string,
		eventDiagnostics: readonly PublicDiagnostic[],
	): boolean {
		if (owner === "event") return false;
		return eventDiagnostics.some((item) => {
			if (
				DiagnosticPolicy.classify(item) === "informational" ||
				!/^(event|referential)\./.test(item.code)
			)
				return false;
			return (
				item.code === code ||
				code === "communication.event-references-unresolved" ||
				(code === "communication.referential-catalog-invalid" &&
					item.code.startsWith("referential."))
			);
		});
	}
}
