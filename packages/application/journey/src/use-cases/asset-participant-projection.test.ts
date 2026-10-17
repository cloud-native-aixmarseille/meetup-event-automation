import { describe, expect, it } from "vitest";
import { AssetParticipantProjection } from "./asset-participant-projection.js";
import { event } from "../../testing/meetup-journey.fixtures.js";
import { publicCatalog, talk } from "../../testing/asset-render.fixtures.js";

const assignments = {
	speakers: { portrait: "speaker-0001" },
	talks: {
		opening: {
			provider: "conference-hall",
			event: "public-cfp",
			id: "proposal-a",
		},
	},
	venues: {},
};

describe("asset participant slots", () => {
	it("retains the same talk and portrait after agenda reordering", () => {
		// Arrange
		const other = {
			...talk,
			proposal: { ...talk.proposal, id: "proposal-b", title: "Other talk" },
		};

		// Act
		const before = AssetParticipantProjection.create(
			{ ...event, agenda: [talk, other] },
			publicCatalog,
			assignments,
		);
		const after = AssetParticipantProjection.create(
			{ ...event, agenda: [other, talk] },
			publicCatalog,
			assignments,
		);

		// Assert
		expect(after).toEqual(before);
		expect(after.talks.opening).toEqual({
			title: "Public title",
			abstract: "Public abstract",
			speakers: ["Example Speaker"],
		});
		expect(after.speakers.portrait).toBe("Public Speaker");
		expect(after.pictures.portrait.speakerId).toBe("speaker-0001");
		expect(JSON.stringify(after)).not.toContain("private");
	});

	it.each([
		{ agenda: [] },
		{
			agenda: [
				{
					...talk,
					proposal: { ...talk.proposal, event: "different-cfp" },
					speakers: [],
				},
			],
		},
	])(
		"leaves removed or differently sourced identities missing",
		({ agenda }) => {
			// Arrange
			const current = { ...event, agenda };

			// Act
			const actual = AssetParticipantProjection.create(
				current,
				publicCatalog,
				assignments,
			);

			// Assert
			expect(actual).toEqual({ speakers: {}, talks: {}, pictures: {} });
		},
	);

	it("does not guess between duplicated proposal identities", () => {
		// Arrange
		const current = { ...event, agenda: [talk, talk] };

		// Act
		const actual = AssetParticipantProjection.create(
			current,
			publicCatalog,
			assignments,
		);

		// Assert
		expect(actual.talks).toEqual({});
	});

	it.each([
		undefined,
		"http://images.example.test/p.png",
		"https://example.test/p.png?token=private",
		"https://user:pass@example.test/p.png",
		"invalid",
	])(
		"keeps a public name when its portrait URL is unusable: %s",
		(pictureUrl) => {
			// Arrange
			const catalog = {
				...publicCatalog,
				speakers: publicCatalog.speakers.map((speaker) => ({
					...speaker,
					pictureUrl,
				})),
			};

			// Act
			const actual = AssetParticipantProjection.create(
				{ ...event, agenda: [talk] },
				catalog,
				assignments,
			);

			// Assert
			expect(actual.pictures).toEqual({});
			expect(actual.speakers.portrait).toBe("Public Speaker");
		},
	);
});
