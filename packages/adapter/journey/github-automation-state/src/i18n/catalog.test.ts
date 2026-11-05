import { describe, expect, it } from "vitest";
import { inspectCatalog } from "../../../../../presentation/localization/testing/catalog-contract.js";
import { CATALOGS } from "./catalog.js";

describe("owned automation state catalogs", () => {
	it.each(["en", "fr"] as const)("renders a complete %s catalog", (locale) => {
		// Arrange
		const parameters = {};
		// Act
		const messages = inspectCatalog(CATALOGS, locale, parameters);
		// Assert
		expect(Object.keys(CATALOGS[locale])).toEqual(Object.keys(CATALOGS.en));
		for (const message of messages) {
			expect(message.text).not.toBe("");
			expect(message.actual).toEqual(message.expected);
		}
	});
});
