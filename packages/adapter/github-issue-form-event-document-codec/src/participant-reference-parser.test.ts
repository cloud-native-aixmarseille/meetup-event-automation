import { describe, expect, it } from "vitest";
import { ParticipantReferenceParser } from "./participant-reference-parser.js";

describe("ParticipantReferenceParser", () => {
	it.each([
		[
			"[Ada Example](https://example.test/speakers/ada)",
			{ displayName: "Ada Example" },
		],
		[
			"Grace Example\t[speaker-0002]",
			{ displayName: "Grace Example", id: "speaker-0002" },
		],
		["  Example Speaker  ", { displayName: "Example Speaker" }],
	])("decodes supported reference %s", (value, expected) => {
		// Arrange
		const reference = value;

		// Act
		const result =
			ParticipantReferenceParser.parseParticipantReference(reference);

		// Assert
		expect(result).toEqual(expected);
	});
});
