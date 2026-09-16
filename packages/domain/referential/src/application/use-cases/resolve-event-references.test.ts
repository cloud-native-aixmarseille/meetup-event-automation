import {
	hostRecord,
	rawCatalog,
	speakerRecord,
} from "../../../testing/referential.fixtures.js";
import type { ReferentialCatalog } from "../../domain/referential-catalog.js";
import { ResolveEventReferences } from "./resolve-event-references.js";
import { ValidateReferentialCatalog } from "./validate-referential-catalog.js";

async function validCatalog() {
	const result = await new ValidateReferentialCatalog().execute(
		rawCatalog({
			hosts: [
				hostRecord(),
				hostRecord({
					hostId: "host-0002",
					displayName: "Other Host",
					contactId: "contact-0002",
				}),
			],
			speakers: [
				speakerRecord(),
				speakerRecord({
					speakerId: "speaker-0002",
					firstName: "Other",
				}),
			],
		}),
	);
	if (!result.isValid) {
		throw new Error("Fixture catalog must be valid");
	}
	return result.catalog;
}

describe("ResolveEventReferences", () => {
	it("resolves normalized legacy names when they are unambiguous", async () => {
		// Arrange
		// Use the shared fixtures.

		// Act
		const result = new ResolveEventReferences().execute(await validCatalog(), {
			hostReference: " example   host ",
			speakerReferences: ["example speaker", "Other Speaker"],
		});

		// Assert
		expect(result.resolved).toBe(true);
		if (!result.resolved) {
			return;
		}
		expect(result.host.id).toBe("host-0001");
		expect(result.speakers.map(({ id }) => id)).toEqual([
			"speaker-0001",
			"speaker-0002",
		]);
	});

	it("resolves explicit Display [stable-id] references and treats IDs as authoritative", async () => {
		// Arrange
		// Use the shared fixtures.

		// Act
		const result = new ResolveEventReferences().execute(await validCatalog(), {
			hostReference: "Old Host Name [host-0001]",
			speakerReferences: ["Old Speaker Name [speaker-0001]"],
		});

		// Assert
		expect(result.resolved).toBe(true);
		if (!result.resolved) {
			return;
		}
		expect(result.host.id).toBe("host-0001");
		expect(result.speakers[0].id).toBe("speaker-0001");
		expect(result.diagnostics.map(({ code }) => code)).toEqual([
			"referential.reference.host.display-name-mismatch",
			"referential.reference.speaker.display-name-mismatch",
		]);
	});

	it("rejects ambiguous legacy display names", async () => {
		// Arrange
		const valid = await validCatalog();
		const ambiguousCatalog: ReferentialCatalog = {
			...valid,
			hosts: [
				valid.hosts[0],
				{ ...valid.hosts[1], displayName: valid.hosts[0].displayName },
			],
			speakers: [
				valid.speakers[0],
				{
					...valid.speakers[1],
					firstName: valid.speakers[0].firstName,
					lastName: valid.speakers[0].lastName,
					displayName: valid.speakers[0].displayName,
				},
			],
		};

		// Act
		const ambiguous = new ResolveEventReferences().execute(ambiguousCatalog, {
			hostReference: "Example Host",
			speakerReferences: ["Example Speaker"],
		});

		// Assert
		expect(ambiguous.resolved).toBe(false);
		expect(ambiguous.diagnostics.map(({ code }) => code)).toEqual([
			"referential.reference.host.ambiguous",
			"referential.reference.speaker.ambiguous",
		]);
	});

	it("resolves ambiguous display names by their explicit stable IDs", async () => {
		// Arrange
		const valid = await validCatalog();
		const ambiguousCatalog: ReferentialCatalog = {
			...valid,
			hosts: [
				valid.hosts[0],
				{ ...valid.hosts[1], displayName: valid.hosts[0].displayName },
			],
			speakers: [
				valid.speakers[0],
				{
					...valid.speakers[1],
					firstName: valid.speakers[0].firstName,
					lastName: valid.speakers[0].lastName,
					displayName: valid.speakers[0].displayName,
				},
			],
		};

		// Act
		const explicit = new ResolveEventReferences().execute(ambiguousCatalog, {
			hostReference: "Example Host [host-0002]",
			speakerReferences: ["Example Speaker [speaker-0002]"],
		});

		// Assert
		expect(explicit.resolved).toBe(true);
	});

	it("rejects malformed and unknown explicit stable identifiers", async () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const result = new ResolveEventReferences().execute(await validCatalog(), {
			hostReference: "Example Host [bad-id]",
			speakerReferences: ["Example Speaker [speaker-9999]"],
		});
		const actual = result.diagnostics.map(({ code }) => code);

		// Assert
		expect(result.resolved).toBe(false);
		expect(actual).toEqual([
			"referential.reference.host.invalid",
			"referential.reference.speaker.unknown",
		]);
	});
});
