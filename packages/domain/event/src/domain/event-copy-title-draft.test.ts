import { describe, expect, it } from "vitest";
import { EventCopyAgenda } from "./event-copy-agenda.js";
import { EventCopyTitleDraft } from "./event-copy-title-draft.js";

const talk = {
	id: "talk-one",
	title: "Observable clusters",
	abstract: "Telemetry for clusters.",
	speakers: [{ id: "speaker-one", name: "Example Speaker" }],
};
describe("event title brief", () => {
	it("supplies only technology topics, excluding identities and unrelated logistics", () => {
		// Arrange
		const title = new EventCopyTitleDraft(new EventCopyAgenda());
		const source = {
			...talk,
			aperitif: true,
			registrationUrl: "https://private.example.test",
			privateEmail: "private@example.test",
		};
		// Act
		const brief = title.brief([source], "fr", "Keep it short");
		// Assert
		expect(brief.facts).toEqual({
			topics: [{ title: talk.title, abstract: talk.abstract }],
		});
		expect(brief.instructions.join(" ")).not.toMatch(
			/aperitif|registrationUrl/,
		);
		expect(brief.language).toBe("fr");
	});
});
