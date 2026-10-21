import { describe, expect, it } from "vitest";
import type { SourceSpeaker } from "../application/ports/proposal-source.js";
import { SourceSpeakerEquality } from "./source-speaker-equality.js";

const speaker: SourceSpeaker = {
	id: "speaker-a",
	displayName: "Example Speaker",
	email: "speaker@example.test",
};

describe("SourceSpeakerEquality", () => {
	it("ignores property ordering and omitted undefined fields", () => {
		// Arrange
		const reordered = {
			email: speaker.email,
			displayName: speaker.displayName,
			id: speaker.id,
			company: undefined,
		};

		// Act
		const equal = SourceSpeakerEquality.equal(speaker, reordered);

		// Assert
		expect(equal).toBe(true);
	});

	it.each([
		{ id: "speaker-b" },
		{ displayName: "Another Speaker" },
		{ email: "another@example.test" },
		{ company: "Example Company" },
		{ company: null },
		{ pictureUrl: "https://example.test/speaker.png" },
		{ pictureUrl: null },
	])("distinguishes changed profile fields: %j", (change) => {
		// Arrange
		const changed = { ...speaker, ...change };

		// Act
		const equal = SourceSpeakerEquality.equal(speaker, changed);

		// Assert
		expect(equal).toBe(false);
	});
});
