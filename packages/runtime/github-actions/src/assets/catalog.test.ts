import { describe, expect, it } from "vitest";
import { inspectCatalog } from "../../../../presentation/localization/testing/catalog-contract.js";
import { CATALOGS } from "./catalog.js";
import type { MessageParameters } from "./message-parameters.js";

const parameters = {
	"asset.agenda.talk": { title: "Public talk", speakers: "Example Speaker" },
	"asset.next-event.missing": {},
	"asset.abstract.missing": {},
	"asset.speaker.generic": {},
	"asset.host.generic": {},
} satisfies MessageParameters;
describe("asset catalogs", () => {
	it.each(["en", "fr"] as const)(
		"validates %s messages and parameters",
		(locale) => {
			// Arrange
			const catalog = CATALOGS[locale];

			// Act
			const inspected = inspectCatalog(CATALOGS, locale, parameters);

			// Assert
			expect(Object.keys(catalog).sort()).toEqual(
				Object.keys(CATALOGS.en).sort(),
			);
			for (const item of inspected) {
				expect(item.text).not.toBe("");
				expect(item.actual).toEqual(item.expected);
			}
		},
	);
});
