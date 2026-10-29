import { PublicationDomainComposition } from "@meetup-automation/publication";
import type { SpeakerId } from "@meetup-automation/referential";
import { describe, expect, it } from "vitest";
import { publicCatalog, talk } from "../../testing/asset-render.fixtures.js";
import { event } from "../../testing/meetup-journey.fixtures.js";
import { AssetParticipantProjection } from "./asset-participant-projection.js";

describe("asset participant positions", () => {
	it("follows current agenda order for talks and unique speakers", () => {
		// Arrange
		const second = {
			...publicCatalog.speakers[0],
			id: "speaker-0002" as SpeakerId,
			displayName: "Second Speaker",
			pictureUrl: "https://images.example.test/second.png",
		};
		const other = {
			...talk,
			proposal: { ...talk.proposal, id: "proposal-b", title: "Other talk" },
			speakers: [{ id: second.id, displayName: second.displayName }],
		};
		const catalog = {
			...publicCatalog,
			speakers: [...publicCatalog.speakers, second],
		};
		const projection = new AssetParticipantProjection({
			publicAssetUrl: new PublicationDomainComposition().publicAssetUrl(),
		});
		// Act
		const before = projection.create(
			{ ...event, agenda: [talk, other, talk] },
			catalog,
		);
		const after = projection.create(
			{ ...event, agenda: [other, talk] },
			catalog,
		);
		// Assert
		expect(before.talks["1"].title).toBe("Public title");
		expect(before.talks["2"].title).toBe("Other talk");
		expect(before.talks["3"].title).toBe("Public title");
		expect(after.talks["1"].title).toBe("Other talk");
		expect(after.talks["2"].title).toBe("Public title");
		expect(before.speakers).toEqual({
			"1": "Public Speaker",
			"2": "Second Speaker",
		});
		expect(after.speakers).toEqual({
			"1": "Second Speaker",
			"2": "Public Speaker",
		});
		expect(after.pictures["1"].speakerId).toBe(second.id);
		expect(after.pictures["2"].speakerId).toBe("speaker-0001");
		expect(JSON.stringify(after)).not.toContain("private");
	});
	it("uses manual agenda descriptions and clears removed participants", () => {
		// Arrange
		const projection = new AssetParticipantProjection({
			publicAssetUrl: new PublicationDomainComposition().publicAssetUrl(),
		});
		// Act
		const manual = projection.create(
			{ ...event, agenda: [{ description: "Manual talk", speakers: [] }] },
			publicCatalog,
		);
		const empty = projection.create({ ...event, agenda: [] }, publicCatalog);
		// Assert
		expect(manual.talks["1"]).toEqual({ title: "Manual talk", speakers: [] });
		expect(empty).toEqual({ speakers: {}, talks: {}, pictures: {} });
	});
	it.each([
		undefined,
		"http://images.example.test/p.png",
		"https://example.test/p.png?token=private",
		"https://user:pass@example.test/p.png",
		"invalid",
	])(
		"keeps the public name when the portrait is unusable: %s",
		(pictureUrl) => {
			// Arrange
			const catalog = {
				...publicCatalog,
				speakers: publicCatalog.speakers.map((speaker) => ({
					...speaker,
					pictureUrl,
				})),
			};
			const projection = new AssetParticipantProjection({
				publicAssetUrl: new PublicationDomainComposition().publicAssetUrl(),
			});
			// Act
			const actual = projection.create({ ...event, agenda: [talk] }, catalog);
			// Assert
			expect(actual.pictures).toEqual({});
			expect(actual.speakers["1"]).toBe("Public Speaker");
		},
	);
});
