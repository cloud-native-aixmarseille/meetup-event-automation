import { describe, expect, it } from "vitest";
import { inspectCatalog } from "../../../../../presentation/localization/testing/catalog-contract.js";
import type { MessageParameters } from "./attention-messages.js";
import { CATALOGS } from "./catalog.js";

const parameters = {
	"attention.redirect": {
		url: "https://github.com/example/meetups/issues/42#issuecomment-100",
	},
	"action.manual-publication": { task: "publication" },
	"action.integration-failure": { task: "assets" },
	"action.follow-up": { task: "thanks" },
	"action.stage-unknown": { task: "feedback" },
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
