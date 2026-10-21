import type { EventDiagnostic, EventDiagnostics } from "./diagnostic.js";
import type { EventAgendaEquality } from "./event-agenda-equality.js";
import type { EventParticipantNormalization } from "./event-participant-normalization.js";
import type { EventRuleResults } from "./event-rule-results.js";
import type { AgendaEntry, MeetupEvent } from "./model.js";
import type { EventPatches, EventPatchOperation } from "./patch.js";
import type { EventRule, EventRuleResult } from "./rule-contracts.js";

export interface EventAgendaRuleCollaborators {
	readonly eventRuleResults: Pick<EventRuleResults, "missing">;
	readonly eventAgendaEquality: Pick<EventAgendaEquality, "equals">;
	readonly eventPatches: Pick<
		EventPatches,
		"replaceEventField" | "createEventPatch"
	>;
	readonly eventDiagnostics: Pick<EventDiagnostics, "diagnostic">;
	readonly eventParticipantNormalization: Pick<
		EventParticipantNormalization,
		"normalizeAgendaEntry"
	>;
}

export class EventAgendaRule implements EventRule {
	constructor(private readonly collaborators: EventAgendaRuleCollaborators) {}

	readonly id = "event-agenda";
	readonly dependencies: readonly string[] = [];

	evaluate(event: MeetupEvent): EventRuleResult {
		if (event.agenda.length === 0) {
			return this.collaborators.eventRuleResults.missing(
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
			!this.collaborators.eventAgendaEquality.equals(
				event.agenda,
				normalizedEntries,
			)
		) {
			operations.push(
				this.collaborators.eventPatches.replaceEventField(
					"agenda",
					normalizedEntries,
					"Normalize agenda",
				),
			);
			diagnostics.push(
				this.collaborators.eventDiagnostics.diagnostic({
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
			patch: this.collaborators.eventPatches.createEventPatch(operations),
		};
	}

	private normalizeEntry(
		entry: AgendaEntry,
		entryIndex: number,
		diagnostics: EventDiagnostic[],
	) {
		const normalized =
			this.collaborators.eventParticipantNormalization.normalizeAgendaEntry(
				entry,
			);
		if (normalized.speakers.length === 0) {
			diagnostics.push(
				this.collaborators.eventDiagnostics.diagnostic({
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
					this.collaborators.eventDiagnostics.diagnostic({
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
				this.collaborators.eventDiagnostics.diagnostic({
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
