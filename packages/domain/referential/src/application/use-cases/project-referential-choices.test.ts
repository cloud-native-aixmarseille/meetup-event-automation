import {
	hostRecord,
	rawCatalog,
	speakerRecord,
} from "../../../testing/referential.fixtures.js";
import { ProjectReferentialChoices } from "./project-referential-choices.js";
import { ValidateReferentialCatalog } from "./validate-referential-catalog.js";

describe("ProjectReferentialChoices", () => {
	it("emits plain public names from a valid catalog", async () => {
		// Arrange
		const validation = await new ValidateReferentialCatalog().execute(
			rawCatalog({
				hosts: [
					hostRecord(),
					hostRecord({
						hostId: "host-0002",
						displayName: "Other Host",
						contactId: "contact-0002",
					}),
					hostRecord({
						hostId: "host-0003",
						displayName: "Unique Host",
						contactId: "contact-0003",
					}),
				],
				speakers: [
					speakerRecord(),
					speakerRecord({
						speakerId: "speaker-0002",
						firstName: "Other",
					}),
					speakerRecord({
						speakerId: "speaker-0003",
						firstName: "Unique",
					}),
				],
			}),
		);
		if (!validation.isValid) {
			throw new Error("Fixture catalog must be valid");
		}

		// Act
		const projection = new ProjectReferentialChoices().execute(
			validation.catalog,
		);
		const actual = Object.isFrozen(projection);
		const actual1 = Object.isFrozen(projection.hostOptions);
		const actual2 = JSON.stringify(projection);
		const actual3 = JSON.stringify(projection);

		// Assert
		expect(projection.hostOptions).toEqual([
			"Example Host",
			"Other Host",
			"Unique Host",
		]);
		expect(projection.speakerReferences).toEqual([
			"Example Speaker",
			"Other Speaker",
			"Unique Speaker",
		]);
		expect(actual).toBe(true);
		expect(actual1).toBe(true);
		expect(actual2).not.toContain("@example.test");
		expect(actual3).not.toContain("Private Contact");
	});
});
