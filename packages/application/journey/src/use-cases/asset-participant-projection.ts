import type { MeetupEvent } from "@meetup-automation/event";
import type {
	AssetRenderAssignments,
	ImageSource,
	PublicAssetTalk,
	PublicAssetUrl,
} from "@meetup-automation/publication";
import type { ReferentialCatalog } from "@meetup-automation/referential";

export interface AssetParticipantProjectionCollaborators {
	readonly publicAssetUrl: Pick<PublicAssetUrl, "valid">;
}

export class AssetParticipantProjection {
	constructor(
		private readonly collaborators: AssetParticipantProjectionCollaborators,
	) {}

	create(
		event: MeetupEvent,
		catalog: ReferentialCatalog,
		assignments: AssetRenderAssignments,
	) {
		const agendaIds = new Set(
			event.agenda.flatMap((talk) =>
				talk.speakers.map((speaker) => speaker.id),
			),
		);
		const speakers: Record<string, string> = {};
		const pictures: Record<string, ImageSource & { speakerId: string }> = {};
		for (const [slot, id] of Object.entries(assignments.speakers)) {
			const speaker = catalog.speakers.find((item) => item.id === id);
			if (!speaker || !agendaIds.has(id)) continue;
			speakers[slot] = speaker.displayName;
			if (this.collaborators.publicAssetUrl.valid(speaker.pictureUrl)) {
				pictures[slot] = {
					speakerId: id,
					url: speaker.pictureUrl,
					description: speaker.displayName,
				};
			}
		}
		const talks: Record<string, PublicAssetTalk> = {};
		for (const [slot, identity] of Object.entries(assignments.talks)) {
			const matches = event.agenda.filter(
				(talk) =>
					talk.proposal?.id === identity.id &&
					talk.proposal.provider === identity.provider &&
					talk.proposal.event === identity.event,
			);
			if (matches.length !== 1) continue;
			const talk = matches[0];
			if (!talk.proposal) continue;
			talks[slot] = {
				title: talk.proposal.title,
				abstract: talk.proposal?.abstract,
				speakers: talk.speakers.map((speaker) => speaker.displayName),
			};
		}
		return { speakers, pictures, talks };
	}
}
