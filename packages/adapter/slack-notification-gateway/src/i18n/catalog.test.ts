import { describe, expect, it } from "vitest";
import { inspectCatalog } from "../../../../presentation/localization/testing/catalog-contract.js";
import { CATALOGS } from "./catalog.js";
import type { MessageParameters } from "./message-parameters.js";

const parameters = {
	"request.introduction": {
		date: "2099-06-08",
		count: 2,
		url: "https://github.com/example/meetups/issues/42#issuecomment-100",
	},
	"request.publication": {
		date: "2099-06-08",
		url: "https://github.com/example/meetups/issues/42#issuecomment-100",
	},
} satisfies { [Key in keyof MessageParameters]: MessageParameters[Key] };

describe("Slack approval catalogs", () => {
	it.each(["en", "fr"] as const)(
		"has complete ICU messages and parameters in %s",
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
				expect(item.text, item.id).not.toBe("");
				expect(item.actual, item.id).toEqual(item.expected);
			}
		},
	);
});
