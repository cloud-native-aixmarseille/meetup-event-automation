import { describe, expect, it } from "vitest";
import { ContentAnchorIdentity } from "./content-anchor-identity.js";

describe("ContentAnchorIdentity", () => {
	it("ignores property order and omitted optional fields", () => {
		// Arrange
		const left = { objectId: "shape", pageId: "page" };
		const right = { pageId: "page", tabId: undefined, objectId: "shape" };

		// Act
		const equal = ContentAnchorIdentity.equal(left, right);
		const keys = [
			ContentAnchorIdentity.locationKey(left),
			ContentAnchorIdentity.locationKey(right),
		];

		// Assert
		expect(equal).toBe(true);
		expect(keys[0]).toBe(keys[1]);
	});

	it("compares positions while keeping ownership tied to a named range", () => {
		// Arrange
		const left = { tabId: "tab", rangeName: "title", start: 1, end: 10 };
		const right = { ...left, start: 2, end: 11 };

		// Act
		const equal = ContentAnchorIdentity.equal(left, right);
		const keys = [
			ContentAnchorIdentity.locationKey(left),
			ContentAnchorIdentity.locationKey(right),
		];

		// Assert
		expect(equal).toBe(false);
		expect(keys[0]).toBe(keys[1]);
	});
});
