import { describe, expect, it } from "vitest";
import { inspectCatalog } from "../../../../../presentation/localization/testing/catalog-contract.js";
import { CATALOGS } from "./catalog.js";

describe("website catalogs", () => {
	it.each(["en", "fr"] as const)("validates %s messages", (locale) => {
		// Arrange
		const parameters = { "website.commit": { date: "2028-06-15" } };
		// Act
		const inspected = inspectCatalog(CATALOGS, locale, parameters);
		// Assert
		expect(Object.keys(CATALOGS[locale]).sort()).toEqual(
			Object.keys(CATALOGS.en).sort(),
		);
		for (const item of inspected) {
			expect(item.actual, item.id).toEqual(item.expected);
			expect(item.text, item.id).not.toBe("");
		}
	});
});
