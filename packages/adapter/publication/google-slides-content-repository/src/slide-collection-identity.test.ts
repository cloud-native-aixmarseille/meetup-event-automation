import { describe, expect, it } from "vitest";
import { PublicationDomainComposition } from "@meetup-automation/publication";
import { collectionFixture } from "../testing/collections.fixtures.js";
import { SlideCollectionIdentity } from "./slide-collection-identity.js";

describe("collection ownership", () => {
	it("updates frozen text references while preserving image keys and layout geometry", () => {
		// Arrange
		const f = collectionFixture("grid");
		const subject = f.composition.collectionIdentity();
		const template = {
			...subject.decode(f.field.template),
			members: [
				{ objectId: "date-shape", type: "text", key: "event.date.numeric" },
				{ objectId: "portrait", type: "image", key: "event.date.numeric" },
			],
		};
		const key = new PublicationDomainComposition()
			.contentTextKey()
			.of({ token: "event.date", format: "DD/MM/YYYY" });
		// Act
		const decoded = subject.decode(
			subject.rekey(
				JSON.stringify(template),
				new Map([["event.date.numeric", key]]),
			),
		);
		// Assert
		expect(decoded).toEqual({
			...template,
			members: [{ ...template.members[0], key }, template.members[1]],
		});
	});

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
