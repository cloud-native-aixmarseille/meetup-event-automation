import type { AgendaEntry, ParticipantReference } from "./model.js";

export class EventParticipantNormalization {
	static normalizeParticipant(
		participant: ParticipantReference,
	): ParticipantReference {
		const displayName = participant.displayName.trim();
		const id = participant.id?.trim();
		return id
			? {
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
			speakers: entry.speakers.map(
				EventParticipantNormalization.normalizeParticipant,
			),
			description: entry.description.trim(),
		};
	}

	static agendaEqual(
		left: readonly AgendaEntry[],
		right: readonly AgendaEntry[],
	): boolean {
		return JSON.stringify(left) === JSON.stringify(right);
	}

	static arraysEqual(
		left: readonly string[],
		right: readonly string[],
	): boolean {
		return (
			left.length === right.length &&
			left.every((value, index) => value === right[index])
		);
	}
}
