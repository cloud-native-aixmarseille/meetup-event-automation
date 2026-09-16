import { type EventDiagnostic, EventDiagnostics } from "./diagnostic.js";
import type { AgendaEntry, ParticipantReference } from "./model.js";
import { ParticipantReferenceParser } from "./participant-reference-parser.js";

export class LegacyEventFields {
	static readString(
		value: unknown,
		field: string,
		diagnostics: EventDiagnostic[],
	): string {
		if (value === undefined || value === null) {
			return "";
		}

		if (typeof value === "string") {
			return value;
		}

		diagnostics.push(
			EventDiagnostics.diagnostic({
				code: "event.document.invalid-field-type",
				severity: "error",
				category: "invalid",
				field,
				message: `The ${field} field must be a string`,
			}),
		);
		return "";
	}

	static readOptionalString(
		value: unknown,
		field: string,
		diagnostics: EventDiagnostic[],
	): string | undefined {
		if (value === undefined || value === null || value === "") {
			return undefined;
		}
		return LegacyEventFields.readString(value, field, diagnostics);
	}

	static readLegacyHost(
		value: unknown,
		diagnostics: EventDiagnostic[],
	): ParticipantReference | undefined {
		if (value === undefined || value === null) {
			return undefined;
		}

		if (!Array.isArray(value)) {
			diagnostics.push(
				EventDiagnostics.diagnostic({
					code: "event.document.invalid-hoster-type",
					severity: "error",
					category: "invalid",
					field: "hoster",
					message: "The legacy hoster field must be an array",
				}),
			);
			return undefined;
		}

		if (value.length > 1) {
			diagnostics.push(
				EventDiagnostics.diagnostic({
					code: "event.hoster.multiple",
					severity: "error",
					category: "invalid",
					field: "hoster",
					message: "A meetup event must have exactly one host",
				}),
			);
		}

		const first = value[0];
		if (first === undefined) {
			return undefined;
		}
		if (typeof first !== "string") {
			diagnostics.push(
				EventDiagnostics.diagnostic({
					code: "event.document.invalid-hoster-entry",
					severity: "error",
					category: "invalid",
					field: "hoster",
					message: "The legacy hoster entry must be a string",
				}),
			);
			return undefined;
		}

		return ParticipantReferenceParser.parseParticipantReference(first);
	}

	static readLegacyAgenda(
		value: unknown,
		diagnostics: EventDiagnostic[],
	): readonly AgendaEntry[] {
		if (value === undefined || value === null || value === "") {
			return [];
		}
		if (typeof value !== "string") {
			diagnostics.push(
				EventDiagnostics.diagnostic({
					code: "event.document.invalid-agenda-type",
					severity: "error",
					category: "invalid",
					field: "agenda",
					message: "The legacy agenda field must be a string",
				}),
			);
			return [];
		}

		const entries: AgendaEntry[] = [];
		for (const [index, line] of value.split("\n").entries()) {
			if (line.trim() === "") {
				continue;
			}
			const agendaLine = ParticipantReferenceParser.parseLegacyAgendaLine(line);
			if (!agendaLine) {
				diagnostics.push(
					EventDiagnostics.diagnostic({
						code: "event.agenda.legacy-line-invalid",
						severity: "error",
						category: "invalid",
						field: `agenda.${index}`,
						message: `Agenda line ${index + 1} does not match "- <speaker(s)>: <description>"`,
					}),
				);
				continue;
			}

			entries.push({
				speakers: agendaLine.speakers
					.split(",")
					.map((speaker) =>
						ParticipantReferenceParser.parseParticipantReference(speaker),
					),
				description: agendaLine.description,
			});
		}
		return entries;
	}
}
