import type { MeetupEvent } from "@meetup-automation/event";
import type {
	AssetRenderAssignments,
	ImageSource,
	PublicAssetTalk,
} from "@meetup-automation/publication";
import type { ReferentialCatalog } from "@meetup-automation/referential";

export class AssetParticipantProjection {
	static create(
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
			if (AssetParticipantProjection.publicUrl(speaker.pictureUrl)) {
				pictures[slot] = {
					speakerId: id,
					url: speaker.pictureUrl as string,
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
			talks[slot] = {
				title: talk.proposal?.title as string,
				abstract: talk.proposal?.abstract,
				speakers: talk.speakers.map((speaker) => speaker.displayName),
			};
		}
		return { speakers, pictures, talks };
	}

	static publicUrl(value?: string): boolean {
		if (!value) return false;
		try {
			const url = new URL(value);
			return (
				url.protocol === "https:" &&
				!url.username &&
				!url.password &&
				![...url.searchParams.keys()].some((key) =>
					/token|signature|credential|secret|key|auth/i.test(key),
				)
			);
		} catch {
			return false;
		}
	}
}
