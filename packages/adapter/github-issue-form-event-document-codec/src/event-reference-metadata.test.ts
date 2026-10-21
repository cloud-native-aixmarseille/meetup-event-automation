import { describe, expect, it } from "vitest";
import { EventReferenceMetadata } from "./event-reference-metadata.js";
import type { StableReferenceMetadata } from "./github-issue-form-event-document-codec-contracts.js";

describe("EventReferenceMetadata", () => {
	it("compares binding fields independently of JSON property ordering", () => {
		// Arrange
		const left: StableReferenceMetadata = {
			schemaVersion: 2,
			host: { id: "host-0001", displayName: "Example Host" },
			speakers: [{ id: "speaker-0001", displayName: "Example Speaker" }],
		};
		const right: StableReferenceMetadata = {
			speakers: [{ displayName: "Example Speaker", id: "speaker-0001" }],
			host: { displayName: "Example Host", id: "host-0001" },
			schemaVersion: 2,
		};

		// Act
		const equal = EventReferenceMetadata.referenceMetadataEqual(left, right);

		// Assert
		expect(equal).toBe(true);
	});

	it("detects a changed participant identity even when its name is unchanged", () => {
		// Arrange
		const left: StableReferenceMetadata = {
			schemaVersion: 2,
			host: null,
			speakers: [{ id: "speaker-0001", displayName: "Example Speaker" }],
		};
		const right: StableReferenceMetadata = {
			...left,
			speakers: [{ id: "speaker-0002", displayName: "Example Speaker" }],
		};

		// Act
		const equal = EventReferenceMetadata.referenceMetadataEqual(left, right);

		// Assert
		expect(equal).toBe(false);
	});
});
