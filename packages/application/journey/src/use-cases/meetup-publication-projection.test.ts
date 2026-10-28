import { describe, expect, it } from "vitest";
import {
	publicationCover,
	publicationFixture,
} from "../../testing/meetup-publication.fixtures.js";
import { MeetupPublicationProjection } from "./meetup-publication-projection.js";
import { ScheduledEventProjection } from "./scheduled-event-projection.js";

describe("Meetup artwork projection", () => {
	it("includes the current approved cover with the scheduled content", async () => {
		// Arrange
		const f = publicationFixture();
		const projection = new MeetupPublicationProjection(
			new ScheduledEventProjection(),
			f.dependencies.artwork,
		);
		// Act
		const result = await projection.create(
			f.currentEvent,
			f.dependencies.settings,
		);
		// Assert
		expect(result).toMatchObject({
			cover: publicationCover,
			title: f.currentEvent.eventTitle,
		});
		expect(f.dependencies.artwork.cover).toHaveBeenCalledWith(f.currentEvent);
	});
	it("does not project an event without current authorized artwork", async () => {
		// Arrange
		const f = publicationFixture();
		f.dependencies.artwork.cover.mockResolvedValue(undefined);
		const projection = new MeetupPublicationProjection(
			new ScheduledEventProjection(),
			f.dependencies.artwork,
		);
		// Act
		const result = projection.create(f.currentEvent, f.dependencies.settings);
		// Assert
		await expect(result).rejects.toMatchObject({ kind: "content-review" });
	});
});
