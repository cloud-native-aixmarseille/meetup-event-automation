import type { MeetupEvent } from "@meetup-automation/event";
import type {
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

	create(event: MeetupEvent, catalog: ReferentialCatalog) {
		const speakers: Record<string, string> = {};
		const pictures: Record<string, ImageSource & { speakerId: string }> = {};
		const talks: Record<string, PublicAssetTalk> = {};
		const seen = new Set<string>();
		const ordered = event.agenda
			.flatMap((talk) => talk.speakers)
			.filter((speaker) => {
				if (!speaker.id || seen.has(speaker.id)) return false;
				seen.add(speaker.id);
				return true;
			});
		for (const [index, selected] of ordered.entries()) {
			const speaker = catalog.speakers.find((item) => item.id === selected.id);
			if (!speaker) continue;
			const slot = String(index + 1);
			speakers[slot] = speaker.displayName;
			if (this.collaborators.publicAssetUrl.valid(speaker.pictureUrl)) {
				pictures[slot] = {
					speakerId: speaker.id,
					url: speaker.pictureUrl,
					description: speaker.displayName,
				};
			}
		}
		for (const [index, talk] of event.agenda.entries()) {
			talks[String(index + 1)] = {
				title: talk.proposal?.title ?? talk.description,
				abstract: talk.proposal?.abstract,
				speakers: talk.speakers.map((speaker) => speaker.displayName),
			};
		}
		return { speakers, pictures, talks };
	}
}
