import { describe, expect, it } from "vitest";
import { CoverArtwork } from "./cover-artwork.js";

const talk = {
	id: "talk-one",
	title: "Observable clusters",
	abstract: "Telemetry for clusters.",
	speakers: [{ id: "speaker-one", name: "Example Speaker" }],
};
describe("cover artwork brief", () => {
	it("commissions four independent scenes with the exact month and topics only", () => {
		// Arrange
		const artwork = new CoverArtwork();
		const facts = {
			month: "FÉVRIER",
			eventDescription:
				"OpenTelemetry signals and a practical incident response exercise.",
			talks: [
				talk,
				{ ...talk, id: "talk-two", title: "Incident response", abstract: "" },
			],
			aperitif: true,
			privateEmail: "private@example.test",
		};
		// Act
		const briefs = artwork.directions.map((direction) =>
			artwork.brief(facts, direction, ""),
		);
		// Assert
		expect(new Set(artwork.directions).size).toBe(4);
		for (const brief of briefs) {
			expect(brief.output).toEqual({
				width: 1792,
				height: 1024,
				mimeType: "image/png",
			});
			expect(brief.facts).toEqual({
				month: "FÉVRIER",
				eventDescription: facts.eventDescription,
				topics: [
					{ title: talk.title, abstract: talk.abstract },
					{ title: "Incident response", abstract: "" },
				],
			});
			expect(brief.instructions.join(" ")).toContain(
				"only readable text anywhere is the exact supplied month",
			);
			expect(brief.instructions.join(" ")).toContain(
				"One coherent full-canvas scene",
			);
			expect(brief.instructions.join(" ")).toContain(
				"Make every distinct talk subject recognizable",
			);
		}
	});
});
