import type { AgendaEntry, ParticipantReference } from "./model.js";

/** Agenda order and public speaker/proposal fields are part of its meaning. */
export class EventAgendaEquality {
	equals(left: readonly AgendaEntry[], right: readonly AgendaEntry[]): boolean {
		return (
			left.length === right.length &&
			left.every((entry, index) => this.entry(entry, right[index]))
		);
	}

	private entry(left: AgendaEntry, right: AgendaEntry): boolean {
		return (
			left.description === right.description &&
			left.speakers.length === right.speakers.length &&
			left.speakers.every((speaker, index) =>
				this.speaker(speaker, right.speakers[index]),
			) &&
			this.proposal(left.proposal, right.proposal)
		);
	}

	private speaker(
		left: ParticipantReference,
		right: ParticipantReference,
	): boolean {
		return (
			left.id === right.id &&
			left.displayName === right.displayName &&
			left.pictureUrl === right.pictureUrl &&
			left.source?.path === right.source?.path &&
			left.source?.line === right.source?.line
		);
	}

	private proposal(
		left: AgendaEntry["proposal"],
		right: AgendaEntry["proposal"],
	): boolean {
		if (!left || !right) return left === right;
		return (
			left.provider === right.provider &&
			left.event === right.event &&
			left.id === right.id &&
			left.title === right.title &&
			left.abstract === right.abstract &&
			this.sequence(left.languages, right.languages) &&
			this.sequence(left.formats, right.formats)
		);
	}

	private sequence(left: readonly string[], right: readonly string[]): boolean {
		return (
			left.length === right.length &&
			left.every((value, index) => value === right[index])
		);
	}
}
