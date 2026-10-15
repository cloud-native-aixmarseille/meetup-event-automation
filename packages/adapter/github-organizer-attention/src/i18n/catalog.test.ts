import { describe, expect, it } from "vitest";
import { inspectCatalog } from "../../../../presentation/localization/testing/catalog-contract.js";
import { CATALOGS } from "./catalog.js";
import type { MessageParameters } from "./attention-messages.js";
const parameters = {
	"attention.date": { date: "2099-06-08" },
	"attention.resolved": { count: 2 },
	"attention.manual-publication": { task: "publication" },
	"attention.integration-failure": { task: "assets" },
	"attention.follow-up": { task: "thanks" },
	"attention.stage-unknown": { task: "feedback" },
} satisfies { [Key in keyof MessageParameters]: MessageParameters[Key] };
describe("attention catalogs", () => {
	it.each(["en", "fr"] as const)(
		"has complete, valid ICU wording in %s",
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
				expect(item.actual, item.id).toEqual(item.expected);
				expect(item.text, item.id).not.toBe("");
			}
		},
	);
});
