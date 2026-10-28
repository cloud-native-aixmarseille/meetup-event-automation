import {
	type ContentImageLoader,
	type ContentMedia,
	type MeetupCoverJournal,
	type MeetupGroupUrl,
	ScheduledEventError,
} from "@meetup-automation/publication";
import type { MeetupCoverImage } from "./meetup-cover-image.js";
import type { MeetupCoverPhoto } from "./meetup-cover-photo.js";

/** Binds reviewed bytes to a durable provider photo identity across browser sessions. */
export class MeetupCover {
	constructor(
		private readonly images: ContentImageLoader,
		private readonly validation: Pick<MeetupCoverImage, "valid">,
		private readonly journal: MeetupCoverJournal,
		private readonly photo: Pick<MeetupCoverPhoto, "persisted" | "upload">,
	) {}

	async matches(cover: ContentMedia, group: MeetupGroupUrl): Promise<boolean> {
		const record = await this.journal.readCover();
		return Boolean(
			record?.photoId &&
				record.groupUrl === group.value &&
				record.fingerprint === cover.fingerprint &&
				(await this.photo.persisted()) === record.photoId,
		);
	}

	async apply(
		cover: ContentMedia,
		group: MeetupGroupUrl,
		beforeSubmit: () => Promise<void>,
	): Promise<void> {
		const record = await this.journal.readCover();
		if (record && (!record.photoId || record.groupUrl !== group.value))
			throw new ScheduledEventError("uncertain");
		if (record?.fingerprint === cover.fingerprint) {
			if ((await this.photo.persisted()) !== record.photoId)
				throw new ScheduledEventError("uncertain");
			await beforeSubmit();
			return;
		}
		const image = await this.images.load(cover.url);
		if (!this.validation.valid(image, cover))
			throw new ScheduledEventError("content-review");
		// Validate first so a rejected image cannot strand an event reservation.
		await beforeSubmit();
		const pending = { groupUrl: group.value, fingerprint: cover.fingerprint };
		await this.journal.reserveCover(pending);
		try {
			const photoId = await this.photo.upload(image, cover.fingerprint);
			await this.journal.recordCover({ ...pending, photoId });
		} catch {
			throw new ScheduledEventError("uncertain");
		}
	}
}
