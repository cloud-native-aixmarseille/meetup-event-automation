import { describe, expect, it } from "vitest";
import { inspectCatalog } from "../../../../../presentation/localization/testing/catalog-contract.js";
import { CATALOGS } from "./catalog.js";
import type { MessageParameters } from "./message-parameters.js";

const parameters = {
	"comment.assets.content-file": {
		documentUrl: "https://drive.google.com/file/d/document_123/view",
	},
	"comment.assets.content-conflict": {
		workflowUrl:
			"https://github.com/example/meetups/actions/workflows/event-reconcile-active.yml",
	},
	"comment.assets.image-context": {
		kind: "host-logo",
		slot: "logo",
		documentUrl: "https://drive.google.com/file/d/example/view",
	},
	"comment.guidance.meetup.uncertain": {
		eventUrl: "https://www.meetup.com/example/events/42/",
		workflowUrl:
			"https://github.com/example/meetups/actions/workflows/event-reconcile-active.yml",
	},
	"comment.guidance.meetup.uncertain-missing-link": {
		workflowUrl:
			"https://github.com/example/meetups/actions/workflows/event-reconcile-active.yml",
	},
	"comment.social.target": {
		destination: "community",
		purpose: "announcement",
	},
	"comment.agenda.item": {
		item: 1,
		speaker: ", speaker 2",
	},
	"comment.agenda.speaker-suffix": {
		speaker: 2,
	},
	"comment.agenda.speaker": {
		speaker: 1,
	},
} satisfies { [Key in keyof MessageParameters]: MessageParameters[Key] };
describe("owned message catalogs", () => {
	it.each(["en", "fr"] as const)(
		"has complete, valid ICU messages and declared parameters for %s",
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
				expect(item.text, item.id).toBeTypeOf("string");
				expect(item.text, item.id).not.toBe("");
				expect(item.actual, item.id).toEqual(item.expected);
			}
		},
	);
});
