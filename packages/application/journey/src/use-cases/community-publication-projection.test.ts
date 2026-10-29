import { expect, it } from "vitest";
import { communityFixture } from "../../testing/community-publication.fixtures.js";
import { CommunityPublicationProjection } from "./community-publication-projection.js";
import { ScheduledEventProjection } from "./scheduled-event-projection.js";

it("projects approved artwork, Meetup link, distinct agenda accounts and the host sponsor", async () => {
	// Arrange
	const f = communityFixture();
	const source = {
		...f.currentEvent,
		agenda: [...f.currentEvent.agenda, ...f.currentEvent.agenda],
	};
	const projection = new CommunityPublicationProjection(
		new ScheduledEventProjection(),
		f.dependencies.artwork,
	);
	// Act
	const result = await projection.create(source, f.dependencies.settings);
	// Assert
	expect(result?.speakers).toEqual([
		f.dependencies.settings.speakers["speaker-0001"],
	]);
	expect(result?.sponsor).toEqual(
		f.dependencies.settings.sponsors["host-0001"],
	);
	expect(result?.meetupUrl).toBe(source.publicationLinks.meetup);
	expect(result?.cover).toBeDefined();
});

it.each(["meetup", "speaker", "sponsor"])(
	"blocks incomplete %s data before publication",
	async (missing) => {
		// Arrange
		const f = communityFixture();
		const source = {
			...f.currentEvent,
			publicationLinks:
				missing === "meetup" ? {} : f.currentEvent.publicationLinks,
		};
		const settings = {
			...f.dependencies.settings,
			...(missing === "speaker" ? { speakers: {} } : {}),
			...(missing === "sponsor" ? { sponsors: {} } : {}),
		};
		const projection = new CommunityPublicationProjection(
			new ScheduledEventProjection(),
			f.dependencies.artwork,
		);
		// Act
		const result = await projection.create(source, settings);
		// Assert
		expect(result).toBeUndefined();
	},
);

it("blocks artwork without current approval", async () => {
	// Arrange
	const f = communityFixture();
	f.dependencies.artwork.cover.mockResolvedValue(undefined);
	const projection = new CommunityPublicationProjection(
		new ScheduledEventProjection(),
		f.dependencies.artwork,
	);
	// Act
	const result = projection.create(f.currentEvent, f.dependencies.settings);
	// Assert
	await expect(result).rejects.toThrow("content-review");
});
