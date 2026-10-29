import type {
	CommunityEvent,
	PublicationWriteGuard,
} from "@meetup-automation/publication";
import type { OcgroupsEventFields } from "./ocgroups-event-fields.js";
import type { OcgroupsPhotos } from "./ocgroups-photos.js";
import type { OcgroupsSpeakers } from "./ocgroups-speakers.js";
import type { OcgroupsSponsors } from "./ocgroups-sponsors.js";

/** The same managed-content contract governs draft readback and publication. */
export class OcgroupsEventContent {
	constructor(
		private readonly fields: Pick<OcgroupsEventFields, "matches" | "write">,
		private readonly speakers: Pick<OcgroupsSpeakers, "matches" | "write">,
		private readonly sponsors: Pick<OcgroupsSponsors, "matches" | "write">,
		private readonly photos: Pick<OcgroupsPhotos, "matches" | "write">,
	) {}
	async matches(event: CommunityEvent): Promise<boolean> {
		return (
			(await this.fields.matches(event)) &&
			(await this.speakers.matches(event.speakers)) &&
			(await this.sponsors.matches(event.sponsor)) &&
			(await this.photos.matches(event.cover))
		);
	}
	async write(
		event: CommunityEvent,
		beforeSubmit: PublicationWriteGuard,
	): Promise<void> {
		await this.fields.write(event);
		await this.speakers.write(event.speakers);
		await this.sponsors.write(event.sponsor);
		await this.photos.write(event.cover, beforeSubmit);
	}
}
