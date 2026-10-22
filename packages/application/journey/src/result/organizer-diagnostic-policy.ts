import type { DiagnosticPolicy } from "./diagnostic-policy.js";
import type { PublicDiagnostic } from "./result-envelope.js";
/** Selects actionable root causes shared by every organizer channel. */
export interface OrganizerDiagnosticPolicyCollaborators {
	readonly diagnosticPolicy: Pick<DiagnosticPolicy, "classify">;
}

export class OrganizerDiagnosticPolicy {
	constructor(
		private readonly collaborators: OrganizerDiagnosticPolicyCollaborators,
	) {}

	suppressed(
		item: PublicDiagnostic,
		diagnostics: readonly PublicDiagnostic[],
	): boolean {
		if (item.severity === "info" || item.fixApplied === true) return true;
		const causes = OrganizerDiagnosticPolicy.PREREQUISITES.get(item.code);
		return (
			causes?.some((prefix) =>
				diagnostics.some(
					(cause) =>
						cause !== item &&
						cause.severity !== "info" &&
						cause.fixApplied !== true &&
						cause.code.startsWith(prefix),
				),
			) ?? false
		);
	}
	private static readonly PREREQUISITES = new Map([
		[
			"publication.assets.pdf.source-pending",
			[
				"publication.assets.content.",
				"publication.assets.prerequisites",
				"publication.assets.file.",
			],
		],
		["event.agenda.missing", ["event.proposals."]],
		["publication.assets.prerequisites", ["event.", "referential.reference."]],
		[
			"publication.feedback.prerequisites",
			["event.", "referential.reference."],
		],
		[
			"publication.feedback.agenda",
			["event.agenda.", "event.proposals.", "referential.reference.speaker."],
		],
		["communication.event-references-unresolved", ["referential.reference."]],
		[
			"communication.referential-catalog-invalid",
			["referential.host.", "referential.speaker.", "referential.contact."],
		],
		["communication.slides-unavailable", ["publication.assets."]],
		[
			"communication.feedback-unavailable",
			["publication.feedback.", "event.proposals.", "event.agenda."],
		],
	]);
	derivative(
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
					this.collaborators.diagnosticPolicy.classify(candidate) !==
						"informational",
			)
		);
	}
}
