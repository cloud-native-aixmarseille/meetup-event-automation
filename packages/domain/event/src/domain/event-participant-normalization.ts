import type { AgendaEntry, ParticipantReference } from "./model.js";

export class EventParticipantNormalization {
	static normalizeParticipant(
		participant: ParticipantReference,
	): ParticipantReference {
		const displayName = participant.displayName.trim();
		const id = participant.id?.trim();
		return id
			? {
					...participant,
					displayName,
					id,
					...(participant.source ? { source: participant.source } : {}),
				}
			: { displayName };
	}

	static participantsEqual(
		left: ParticipantReference,
		right: ParticipantReference,
	): boolean {
		return left.displayName === right.displayName && left.id === right.id;
	}

	static normalizeAgendaEntry(entry: AgendaEntry): AgendaEntry {
		return {
			...entry,
			speakers: entry.speakers.map(
				EventParticipantNormalization.normalizeParticipant,
			),
			description: entry.description.trim(),
		};
	}
}
