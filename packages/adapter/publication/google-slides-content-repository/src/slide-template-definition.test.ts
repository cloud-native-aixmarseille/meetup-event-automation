import type { slides_v1 } from "@googleapis/slides";
import { PublicationDomainComposition } from "@meetup-automation/publication";
import { TemplatingComposition } from "@meetup-automation/templating";
import { describe, expect, it } from "vitest";
import { slidesFixture, templateDefaults } from "../testing/slides.fixtures.js";
import { GoogleSlidesContentRepositoryComposition } from "./dependency-composition.js";
import { SlideTemplateDefinition } from "./slide-template-definition.js";

function definition() {
	return new SlideTemplateDefinition(
		new TemplatingComposition().parser(),
		new PublicationDomainComposition().contentTemplateFields(),
		new GoogleSlidesContentRepositoryComposition().slideTemplateBindings(),
	);
}

describe("Slides template discovery", () => {
	it("discovers text and repeated image selectors directly from native elements", () => {
		// Arrange
		const f = slidesFixture();
		f.firstRun.content = "[TALK_TITLE:1]\n";
		f.page.pageElements?.push(
			...["portrait-a", "portrait-b"].map((objectId) => ({
				objectId,
				title: "{{speaker.picture:1}}",
				description: "Speaker portrait",
				image: {},
			})),
		);
		const subject = definition();
		// Act
		const contract = subject.read(f.presentation, "slides", templateDefaults);
		// Assert
		expect(contract?.fields).toEqual([
			{ type: "text", token: "talk.title", slot: "1", required: true },
			{ type: "text", token: "event.title", required: true },
			...["portrait-a", "portrait-b"].map((objectId) => ({
				type: "image",
				token: "speaker.picture",
				slot: objectId,
				sourceSlot: "1",
				objectId,
				pageId: "page",
				required: false,
				fit: "CENTER_CROP",
				fallback: templateDefaults.speaker,
			})),
		]);
		expect(contract?.revision).toMatch(/^template-/);
	});
	it.each<slides_v1.Schema$PageElement>([
		{
			objectId: "unknown",
			shape: {
				text: {
					textElements: [{ textRun: { content: "{{speaker.email:1}}\n" } }],
				},
			},
		},
		{
			objectId: "invalid-position",
			shape: {
				text: {
					textElements: [{ textRun: { content: "{{talk.title:opening}}\n" } }],
				},
			},
		},
		{
			objectId: "invalid-image",
			title: "Photo {{speaker.picture:1}}",
			description: "Speaker portrait",
			image: {},
		},
		{
			objectId: "group",
			elementGroup: {
				children: [
					{
						objectId: "image",
						title: "{{host.logo}}",
						description: "Logo",
						image: {},
					},
				],
			},
		},
		{ objectId: "shape-with-image-marker", title: "{{host.logo}}", shape: {} },
	])("rejects unsupported or ambiguous native locations", (element) => {
		// Arrange
		const f = slidesFixture();
		f.page.pageElements = [element];
		const subject = definition();
		// Act
		let error: unknown;
		try {
			subject.read(f.presentation, "slides", templateDefaults);
		} catch (caught) {
			error = caught;
		}
		// Assert
		expect(error).toMatchObject({ name: "ContentError" });
	});
	it("leaves unmarked templates in copy-only mode", () => {
		// Arrange
		const f = slidesFixture();
		f.page.pageElements = [
			{
				objectId: "static",
				shape: {
					text: { textElements: [{ textRun: { content: "Welcome\n" } }] },
				},
			},
		];
		const subject = definition();
		// Act
		const contract = subject.read(f.presentation, "slides", templateDefaults);
		// Assert
		expect(contract).toBeUndefined();
	});
});
