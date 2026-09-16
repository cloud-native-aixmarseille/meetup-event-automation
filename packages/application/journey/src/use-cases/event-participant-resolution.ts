import type {
	MeetupEvent,
	ParticipantReference,
} from "@meetup-automation/event";

export class EventParticipantResolution {
	static renderReference(reference: {
		id?: string;
		displayName: string;
	}): string {
		return reference.id
			? `${reference.displayName} [${reference.id}]`
			: reference.displayName;
	}

	static enrichStableReferences(
		event: MeetupEvent,
		host: ParticipantReference,
		speakers: readonly ParticipantReference[],
	): MeetupEvent {
		return {
			...event,
			host: EventParticipantResolution.resolvedParticipant(host),
			agenda: event.agenda.map((entry) => ({
				...entry,
				speakers: entry.speakers.map((reference) => {
					const matches = speakers.filter(
						(speaker) =>
							speaker.id === reference.id ||
							EventParticipantResolution.canonical(speaker.displayName) ===
								EventParticipantResolution.canonical(reference.displayName),
					);
					const speaker = matches.length === 1 ? matches[0] : undefined;
					return speaker
						? EventParticipantResolution.resolvedParticipant(speaker)
						: reference;
				}),
			})),
		};
	}

	static resolvedParticipant(
		reference: ParticipantReference,
	): ParticipantReference {
		return {
			id: reference.id,
			displayName: reference.displayName,
			...(reference.source ? { source: reference.source } : {}),
		};
	}

	static canonical(value: string): string {
		return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
	}
}
