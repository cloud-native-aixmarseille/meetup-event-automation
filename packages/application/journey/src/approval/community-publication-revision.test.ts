import { PublicationDomainComposition } from "@meetup-automation/publication";
import { describe, expect, it } from "vitest";
import {
	communityFixture,
	remote,
} from "../../testing/community-publication.fixtures.js";
import { CommunityPublicationProjection } from "../use-cases/community-publication-projection.js";
import { ScheduledEventProjection } from "../use-cases/scheduled-event-projection.js";
import { CommunityPublicationRevision } from "./community-publication-revision.js";

async function fixture() {
	const f = communityFixture();
	const event = await new CommunityPublicationProjection(
		new ScheduledEventProjection(),
		f.dependencies.artwork,
	).create(f.currentEvent, f.dependencies.settings);
	if (!event) throw new Error("Invalid fixture");
	return {
		event,
		revision: new CommunityPublicationRevision(
			new PublicationDomainComposition().contentFingerprint(),
		),
	};
}
describe("community approval revisions", () => {
	it.each([
		"description",
		"category",
		"address",
		"capacity",
		"reminder",
		"target",
		"identity",
		"slug",
	])("invalidates approval when %s changes", async (field) => {
		// Arrange
		const { event, revision } = await fixture();
		let changed = structuredClone(event);
		let identity = remote;
		let target = "target";
		if (field === "description")
			changed = { ...changed, description: `${changed.description} Changed` };
		if (field === "category") changed = { ...changed, categoryId: "other" };
		if (field === "address")
			changed = {
				...changed,
				venue: { ...changed.venue, address: "Another road" },
			};
		if (field === "capacity")
			changed = {
				...changed,
				registration: { ...changed.registration, capacity: 80 },
			};
		if (field === "reminder")
			changed = {
				...changed,
				registration: { ...changed.registration, reminder: false },
			};
		if (field === "target") target = "other-target";
		if (field === "identity") identity = { ...remote, id: "other-id" };
		if (field === "slug")
			identity = { ...remote, publicUrl: `${remote.publicUrl}-changed` };
		// Act
		const original = revision.of(event, remote, "target");
		const updated = revision.of(changed, identity, target);
		// Assert
		expect(updated).not.toBe(original);
	});
});

describe("community artwork and contributor approval", () => {
	it.each(["meetupUrl", "cover", "speaker", "sponsor"])(
		"invalidates approval for a changed %s",
		async (field) => {
			// Arrange
			const { event, revision } = await fixture();
			const changed = {
				...event,
				...(field === "meetupUrl"
					? { meetupUrl: "https://www.meetup.com/example/events/99999/" }
					: {}),
				...(field === "cover"
					? { cover: { ...event.cover, fingerprint: "b".repeat(64) } }
					: {}),
				...(field === "speaker"
					? {
							speakers: [
								{
									...event.speakers[0],
									userId: "70000000-0000-4000-8000-000000000007",
								},
							],
						}
					: {}),
				...(field === "sponsor"
					? { sponsor: { ...event.sponsor, level: "Venue" } }
					: {}),
			};
			// Act
			const original = revision.of(event, remote, "target");
			const updated = revision.of(changed, remote, "target");
			// Assert
			expect(updated).not.toBe(original);
		},
	);
});
