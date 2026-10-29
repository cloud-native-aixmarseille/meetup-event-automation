import { SlideCollectionLayout } from "./slide-collection-layout.js";
import { describe, expect, it } from "vitest";
import { collectionFixture } from "../testing/collections.fixtures.js";
import { templateDefaults } from "../testing/slides.fixtures.js";
import { SlideCollectionDefinition } from "./slide-collection-definition.js";
import { PublicationDomainComposition } from "@meetup-automation/publication";
import { TemplatingComposition } from "@meetup-automation/templating";

describe("native collection discovery", () => {
	it.each(["slide", "grid"] as const)(
		"freezes %s members without numbered placeholders",
		(mode) => {
			// Arrange
			const f = collectionFixture(mode);
			const domain = new PublicationDomainComposition();
			const templating = new TemplatingComposition();
			const subject = new SlideCollectionDefinition(
				new SlideCollectionLayout(),
				templating.collectionParser(),
				templating.parser(),
				domain.contentTemplateFields(),
				domain.contentTextKey(),
				f.composition.slideTemplateBindings(),
			);
			// Act
			const fields = subject.read(
				f.presentation.slides?.[0] ?? {},
				templateDefaults,
			);
			// Assert
			expect(fields).toHaveLength(1);
			expect(fields[0]).toMatchObject({
				token: "talks",
				fields: [{ type: "text", token: "talk.title", slot: "1" }],
			});
			expect(JSON.parse(fields[0].template)).toMatchObject({
				mode,
				members: [{ objectId: "talk-title", key: "talk.title:1" }],
			});
		},
	);
	it("rejects a numbered selector inside a repeated scope", () => {
		// Arrange
		const f = collectionFixture();
		const run = f.title.shape?.text?.textElements?.[0].textRun;
		if (run) run.content = "{{talk.title:2}}\n";
		const subject = f.composition.definition();
		// Act
		const action = () =>
			subject.read(f.presentation, "slides", templateDefaults);
		// Assert
		expect(action).toThrow();
	});
});
