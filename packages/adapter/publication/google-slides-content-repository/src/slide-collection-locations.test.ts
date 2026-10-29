import { describe, expect, it } from "vitest";
import { PublicationDomainComposition } from "@meetup-automation/publication";
import { collectionFixture } from "../testing/collections.fixtures.js";
import { SlideCollectionLocations } from "./slide-collection-locations.js";

describe("collection observations", () => {
	it("ignores temporary image URLs but detects changed image bytes", async () => {
		// Arrange
		const f = collectionFixture();
		const image = {
			objectId: "static-logo",
			image: { contentUrl: "https://images.example.test/temporary-a" },
		};
		f.presentation.slides?.[0].pageElements?.push(image);
		let bytes = "same image";
		const subject = new SlideCollectionLocations(
			f.composition.collectionIdentity(),
			new PublicationDomainComposition().contentFingerprint(),
			{
				validate: async (source) => ({ source, fingerprint: bytes }),
				observe: async () => bytes,
			},
		);
		const binding = {
			id: f.field.slot,
			key: f.field.slot,
			type: "collection" as const,
			anchor: { objectId: f.field.objectId, pageId: f.field.pageId },
			applied: "",
		};
		// Act
		const before = await subject.read(f.presentation, f.field, binding);
		image.image.contentUrl = "https://images.example.test/temporary-b";
		const same = await subject.read(f.presentation, f.field, binding);
		bytes = "different image";
		const changed = await subject.read(f.presentation, f.field, binding);
		// Assert
		expect(same.fingerprint).toBe(before.fingerprint);
		expect(changed.fingerprint).not.toBe(before.fingerprint);
	});
});
