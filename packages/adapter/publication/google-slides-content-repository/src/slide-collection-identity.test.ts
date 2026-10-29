import { describe, expect, it } from "vitest";
import { PublicationDomainComposition } from "@meetup-automation/publication";
import { collectionFixture } from "../testing/collections.fixtures.js";
import { SlideCollectionIdentity } from "./slide-collection-identity.js";

describe("collection ownership", () => {
	it("rejects a frozen member outside its owned container", () => {
		// Arrange
		const f = collectionFixture("grid");
		const subject = new SlideCollectionIdentity(
			new PublicationDomainComposition().contentFingerprint(),
		);
		const template = JSON.parse(f.field.template);
		template.members[0].objectId = "outside-text";
		// Act
		const action = () =>
			subject.roots(f.presentation, {
				...f.field,
				template: JSON.stringify(template),
			});
		// Assert
		expect(action).toThrow();
	});
	it("accepts existing provider page IDs shorter than newly created IDs", () => {
		// Arrange
		const f = collectionFixture("grid");
		const subject = new SlideCollectionIdentity(
			new PublicationDomainComposition().contentFingerprint(),
		);
		const template = { ...JSON.parse(f.field.template), pageId: "p1" };
		// Act
		const parsed = subject.decode(JSON.stringify(template));
		// Assert
		expect(parsed.pageId).toBe("p1");
	});

	it.each(["{", "null", '{"mode":"grid"}'])(
		"rejects invalid frozen template %s",
		(template) => {
			// Arrange
			const subject = new SlideCollectionIdentity(
				new PublicationDomainComposition().contentFingerprint(),
			);
			// Act
			const action = () => subject.decode(template);
			// Assert
			expect(action).toThrow();
		},
	);
});
