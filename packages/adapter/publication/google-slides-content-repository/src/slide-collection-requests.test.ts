import { SlideCollectionLayout } from "./slide-collection-layout.js";
import { describe, expect, it } from "vitest";
import { collectionFixture } from "../testing/collections.fixtures.js";
import { SlideCollectionRequests } from "./slide-collection-requests.js";
import type { ContentChange } from "@meetup-automation/publication";

describe("native repeated content", () => {
	it.each([1, 3, 7])("renders all %i talks as native sections", (count) => {
		// Arrange
		const f = collectionFixture();
		const subject = new SlideCollectionRequests(
			new SlideCollectionLayout(),
			f.composition.collectionIdentity(),
			f.composition.collectionDefinition(),
			f.composition.slideContentRequests(),
		);
		const change: ContentChange = {
			location: {
				id: f.field.slot,
				key: f.field.slot,
				type: "collection",
				anchor: { pageId: f.field.pageId, objectId: f.field.objectId },
				fingerprint: "before",
			},
			value: {
				type: "collection",
				key: f.field.slot,
				fingerprint: "after",
				collection: {
					template: f.field.template,
					items: Array.from({ length: count }, (_, index) => [
						{
							type: "text",
							key: "talk.title:1",
							text: `Talk ${index + 1}`,
							fingerprint: String(index),
						},
					]),
				},
			},
		};
		// Act
		const requests = subject.build(f.presentation, change);
		// Assert
		expect(requests.filter((request) => request.duplicateObject)).toHaveLength(
			count - 1,
		);
		expect(
			requests
				.filter((request) => request.insertText)
				.map((request) => request.insertText?.text)
				.sort(),
		).toEqual(Array.from({ length: count }, (_, index) => `Talk ${index + 1}`));
		expect(JSON.stringify(requests)).not.toContain("outside-text");
	});
	it("fits all cards within one page", () => {
		// Arrange
		const f = collectionFixture("grid");
		const subject = new SlideCollectionRequests(
			new SlideCollectionLayout(),
			f.composition.collectionIdentity(),
			f.composition.collectionDefinition(),
			f.composition.slideContentRequests(),
		);
		const change: ContentChange = {
			location: {
				id: f.field.slot,
				key: f.field.slot,
				type: "collection",
				anchor: { pageId: f.field.pageId, objectId: f.field.objectId },
				fingerprint: "before",
			},
			value: {
				type: "collection",
				key: f.field.slot,
				fingerprint: "after",
				collection: {
					template: f.field.template,
					items: Array.from({ length: 5 }, () => [
						{
							type: "text",
							key: "talk.title:1",
							text: "Talk",
							fingerprint: "title",
						},
					]),
				},
			},
		};
		// Act
		const requests = subject.build(f.presentation, change);
		// Assert
		expect(
			requests
				.filter((request) => request.duplicateObject)
				.every((request) => request.duplicateObject?.objectId === "talk-cards"),
		).toBe(true);
		const transforms = requests.flatMap(
			(request) => request.updatePageElementTransform?.transform ?? [],
		);
		expect(transforms).toHaveLength(5);
		expect(
			transforms.every(
				(transform) =>
					(transform.translateX ?? 0) >= 40 &&
					(transform.translateX ?? 0) + 600 * (transform.scaleX ?? 0) <= 640 &&
					(transform.translateY ?? 0) + 200 * (transform.scaleY ?? 0) <= 250,
			),
		).toBe(true);
	});
});
