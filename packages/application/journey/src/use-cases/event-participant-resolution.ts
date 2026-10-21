import type {
	MeetupEvent,
	ParticipantReference,
} from "@meetup-automation/event";

export class EventParticipantResolution {
	renderReference(reference: { id?: string; displayName: string }): string {
		return reference.id
			? `${reference.displayName} [${reference.id}]`
			: reference.displayName;
	}

	enrichStableReferences(
		event: MeetupEvent,
		host: ParticipantReference,
		speakers: readonly ParticipantReference[],
	): MeetupEvent {
		return {
			...event,
			host: this.resolvedParticipant(host),
			agenda: event.agenda.map((entry) => ({
				...entry,
				speakers: entry.speakers.map((reference) => {
					const matches = speakers.filter((speaker) =>
						reference.id
							? speaker.id === reference.id
							: this.canonical(speaker.displayName) ===
								this.canonical(reference.displayName),
					);
					const speaker = matches.length === 1 ? matches[0] : undefined;
					return speaker ? this.resolvedParticipant(speaker) : reference;
				}),
			})),
		};
	}

	resolvedParticipant(reference: ParticipantReference): ParticipantReference {
		return {
			id: reference.id,
			displayName: reference.displayName,
			...(reference.pictureUrl ? { pictureUrl: reference.pictureUrl } : {}),
			...(reference.source ? { source: reference.source } : {}),
		};
	}

	canonical(value: string): string {
		return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
	}
}
