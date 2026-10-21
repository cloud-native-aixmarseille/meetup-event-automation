import { describe, expect, it } from "vitest";
import { speakerRecord } from "../../../testing/referential.fixtures.js";
import { ReferentialDomainComposition } from "../../dependency-composition.js";
import type { ReferentialDiagnostic } from "../../domain/referential-diagnostic.js";
import { SpeakerSourceFields } from "./speaker-source-fields.js";

describe("SpeakerSourceFields", () => {
	it("recognizes duplicate source identities independently of property order", () => {
		// Arrange
		const diagnostics: ReferentialDiagnostic[] = [];
		const [speaker] = new ReferentialDomainComposition()
			.speakerCatalogValidator()
			.validateSpeakers([speakerRecord()], []);
		const first = {
			...speaker,
			sourceIdentity: {
				provider: "conference-hall",
				event: "example-cfp",
				speakerId: "source-1",
			},
		};
		const second = {
			...speaker,
			sourceIdentity: {
				speakerId: "source-1",
				event: "example-cfp",
				provider: "conference-hall",
			},
		};

		// Act
		new SpeakerSourceFields().validateMappings([first, second], diagnostics);

		// Assert
		expect(diagnostics).toEqual([
			expect.objectContaining({
				code: "referential.speaker.mapping.invalid",
				path: "speakers[1].sourceIdentity",
			}),
		]);
	});
	it("rejects partial source identities without leaking values", () => {
		// Arrange
		const diagnostics: ReferentialDiagnostic[] = [];

		// Act
		const result = new SpeakerSourceFields().read(
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
		const result = new SpeakerSourceFields().read(
			speakerRecord({ pictureUrl }),
			0,
			diagnostics,
		);

		// Assert
		expect(result.pictureUrl).toBeUndefined();
		expect(diagnostics).toEqual([]);
	});
});
