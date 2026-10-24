import { describe, expect, it } from "vitest";
import { EventCopyAgenda } from "./event-copy-agenda.js";
import { EventCopyDescriptionDraft } from "./event-copy-description-draft.js";

const talk = {
	id: "talk-one",
	title: "Observable clusters",
	abstract: "Telemetry for clusters.",
	speakers: [{ id: "speaker-one", name: "Example Speaker" }],
};
const facts = {
	date: "2026-10-28",
	startTime: "18:45",
	endTime: "21:00",
	timeZone: "Europe/Paris",
	host: { name: "Example Host", city: "Example City" },
	talks: [talk],
	aperitif: false,
};
describe("event description brief", () => {
	it.each([
		{ length: 12000, expected: true },
		{ length: 12001, expected: false },
	])(
		"enforces the description limit for $length characters",
		({ length, expected }) => {
			// Arrange
			const description = new EventCopyDescriptionDraft(new EventCopyAgenda());
			const text = "a".repeat(length);
			// Act
			const valid = description.valid(facts, text);
			// Assert
			expect(valid).toBe(expected);
		},
	);
	it("owns confirmed logistics and excludes unrelated social configuration", () => {
		// Arrange
		const description = new EventCopyDescriptionDraft(new EventCopyAgenda());
		const source = {
			...facts,
			mentions: ["Unrelated organizer"],
			privateEmail: "private@example.test",
			registrationUrl: "https://example.test",
		};
		// Act
		const brief = description.brief(source, "fr", "");
		// Assert
		expect(brief.facts).toEqual(facts);
		expect(brief.instructions.join(" ")).toContain("only when aperitif=true");
		expect(brief.instructions.join(" ")).toContain("publication appends them");
	});
});
