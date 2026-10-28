import type { MeetupEvent } from "@meetup-automation/event";
import {
	type MeetupPublicationEvent,
	ScheduledEventError,
} from "@meetup-automation/publication";
import type { CoverArtworkApprovalGate } from "../assets/cover-artwork-approval-gate.js";
import type {
	ScheduledEventProjection,
	ScheduledEventSettings,
} from "./scheduled-event-projection.js";

/** Meetup publishes the same current, authorized artwork as the event assets. */
export class MeetupPublicationProjection {
	constructor(
		private readonly schedule: Pick<ScheduledEventProjection, "create">,
		private readonly artwork: Pick<CoverArtworkApprovalGate, "cover">,
	) {}

	async create(
		event: MeetupEvent,
		settings: ScheduledEventSettings,
	): Promise<MeetupPublicationEvent | undefined> {
		const scheduled = this.schedule.create(event, settings);
		if (!scheduled) return undefined;
		const cover = await this.artwork.cover(event);
		if (!cover) throw new ScheduledEventError("content-review");
		return { ...scheduled, cover };
	}
}
