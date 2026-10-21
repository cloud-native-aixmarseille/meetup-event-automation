import { describe, expect, it } from "vitest";
import { EventAgendaEquality } from "./event-agenda-equality.js";
import type { AgendaEntry } from "./model.js";

const entry = {
	description: "Containers",
	speakers: [
		{
			id: "speaker-one",
			displayName: "Speaker One",
			pictureUrl: "https://example.org/portrait",
			source: { path: "agenda", line: 2 },
		},
	],
	proposal: {
		provider: "conference-hall",
		event: "cfp",
		id: "talk-one",
		title: "Containers",
		abstract: "Overview",
		languages: ["fr", "en"],
		formats: ["talk"],
	},
} satisfies AgendaEntry;

describe("EventAgendaEquality", () => {
	it("ignores property order and omitted optional properties", () => {
		// Arrange
		const original: AgendaEntry = {
			description: "Containers",
			speakers: [{ displayName: "Speaker" }],
		};
		const reordered: AgendaEntry = {
			speakers: [{ id: undefined, displayName: "Speaker" }],
			description: "Containers",
			proposal: undefined,
		};

		// Act
		const equal = new EventAgendaEquality().equals([original], [reordered]);

		// Assert
		expect(equal).toBe(true);
	});

	it.each([
		{ ...entry, description: "Different talk" },
		{ ...entry, speakers: [] },
		{ ...entry, speakers: [{ ...entry.speakers[0], pictureUrl: undefined }] },
		{
			...entry,
			speakers: [{ ...entry.speakers[0], source: { path: "agenda", line: 3 } }],
		},
		{ ...entry, proposal: undefined },
		{ ...entry, proposal: { ...entry.proposal, title: "Different title" } },
		{ ...entry, proposal: { ...entry.proposal, languages: ["en", "fr"] } },
	])("detects changes to agenda meaning", (changed) => {
		// Arrange
		const original = [entry];

		// Act
		const equal = new EventAgendaEquality().equals(original, [changed]);

		// Assert
		expect(equal).toBe(false);
	});

	it("preserves agenda order", () => {
		// Arrange
		const second = { ...entry, description: "Networking" };

		// Act
		const equal = new EventAgendaEquality().equals(
			[entry, second],
			[second, entry],
		);

		// Assert
		expect(equal).toBe(false);
	});
});
