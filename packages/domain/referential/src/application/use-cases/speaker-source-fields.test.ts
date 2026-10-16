import { describe, expect, it } from "vitest";
import type { ReferentialDiagnostic } from "../../domain/referential-diagnostic.js";
import { speakerRecord } from "../../../testing/referential.fixtures.js";
import { SpeakerSourceFields } from "./speaker-source-fields.js";

describe("SpeakerSourceFields", () => {
	it("rejects partial source identities without leaking values", () => {
		// Arrange
		const diagnostics: ReferentialDiagnostic[] = [];
		// Act
		const result = SpeakerSourceFields.read(
			speakerRecord({
				sourceProvider: "conference-hall",
				sourceSpeakerId: "private-id",
			}),
			0,
			diagnostics,
		);
		// Assert
		expect(result).toEqual({});
		expect(diagnostics[0].code).toBe("referential.speaker.mapping.invalid");
		expect(JSON.stringify(diagnostics)).not.toContain("private-id");
	});
	it.each([
		"javascript:alert(1)",
		"http://example.test/a",
		"https://secret@example.test/a",
		"invalid",
	])("falls back to a text profile for %s", (pictureUrl) => {
		// Arrange
		const diagnostics: ReferentialDiagnostic[] = [];
		// Act
		const result = SpeakerSourceFields.read(
			speakerRecord({ pictureUrl }),
			0,
			diagnostics,
		);
		// Assert
		expect(result.pictureUrl).toBeUndefined();
		expect(diagnostics).toEqual([]);
	});
});
