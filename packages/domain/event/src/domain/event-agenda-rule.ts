import { type EventDiagnostic, EventDiagnostics } from "./diagnostic.js";
import { EventParticipantNormalization } from "./event-participant-normalization.js";
import { EventRuleResults } from "./event-rule-results.js";
import type { AgendaEntry, MeetupEvent } from "./model.js";
import { EventPatches, type EventPatchOperation } from "./patch.js";
import type { EventRule, EventRuleResult } from "./rule-contracts.js";

export class EventAgendaRule implements EventRule {
	readonly id = "event-agenda";
	readonly dependencies: readonly string[] = [];

	evaluate(event: MeetupEvent): EventRuleResult {
		if (event.agenda.length === 0) {
			return EventRuleResults.missing(
				"event.agenda.missing",
				"agenda",
				"At least one agenda entry is required",
			);
		}

		const diagnostics: EventDiagnostic[] = [];
		const normalizedEntries = event.agenda.map((entry, entryIndex) => {
			return this.normalizeEntry(entry, entryIndex, diagnostics);
		});

		const operations: EventPatchOperation[] = [];
		if (
			!EventParticipantNormalization.agendaEqual(
				event.agenda,
				normalizedEntries,
			)
		) {
			operations.push(
				EventPatches.replaceEventField(
					"agenda",
					normalizedEntries,
					"Normalize agenda",
				),
			);
			diagnostics.push(
				EventDiagnostics.diagnostic({
					code: "event.agenda.normalized",
					severity: "info",
					category: "normalization",
					field: "agenda",
					message: "The agenda can be normalized safely",
					fixAvailable: true,
				}),
			);
		}

		return {
			diagnostics,
			patch: EventPatches.createEventPatch(operations),
		};
	}

	private normalizeEntry(
		entry: AgendaEntry,
		entryIndex: number,
		diagnostics: EventDiagnostic[],
	) {
		const normalized =
			EventParticipantNormalization.normalizeAgendaEntry(entry);
		if (normalized.speakers.length === 0) {
			diagnostics.push(
				EventDiagnostics.diagnostic({
					code: "event.agenda.speaker.missing",
					severity: "error",
					category: "invalid",
					field: `agenda.${entryIndex}.speakers`,
					message: "Each agenda entry must have at least one speaker",
				}),
			);
		}

		for (const [speakerIndex, speaker] of normalized.speakers.entries()) {
			if (speaker.displayName === "") {
				diagnostics.push(
					EventDiagnostics.diagnostic({
						code: "event.agenda.speaker.invalid",
						severity: "error",
						category: "invalid",
						field: `agenda.${entryIndex}.speakers.${speakerIndex}`,
						message: "Speaker display name must not be empty",
					}),
				);
			}
		}

		if (normalized.description === "") {
			diagnostics.push(
				EventDiagnostics.diagnostic({
					code: "event.agenda.description.missing",
					severity: "error",
					category: "invalid",
					field: `agenda.${entryIndex}.description`,
					message: "Agenda entry description must not be empty",
				}),
			);
		}
		return normalized;
	}
}
