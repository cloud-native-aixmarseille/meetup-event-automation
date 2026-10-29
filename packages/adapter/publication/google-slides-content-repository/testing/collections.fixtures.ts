import type { slides_v1 } from "@googleapis/slides";
import { GoogleSlidesContentRepositoryComposition } from "../src/dependency-composition.js";
import { templateDefaults } from "./slides.fixtures.js";

export function collectionFixture(mode: "slide" | "grid" = "slide") {
	const title: slides_v1.Schema$PageElement = {
		objectId: "talk-title",
		title: "{{#each talks}}",
		size: {
			width: { magnitude: 600, unit: "PT" },
			height: { magnitude: 200, unit: "PT" },
		},
		transform: {
			scaleX: 1,
			scaleY: 1,
			translateX: 0,
			translateY: 0,
			unit: "PT",
		},
		shape: {
			shapeType: "TEXT_BOX",
			text: {
				textElements: [
					{
						textRun: {
							content: "{{talk.title}}\n",
							style: { fontSize: { magnitude: 32, unit: "PT" } },
						},
					},
				],
			},
		},
	};
	const manual: slides_v1.Schema$PageElement = {
		objectId: "manual-label",
		shape: {
			text: { textElements: [{ textRun: { content: "Community\n" } }] },
		},
	};
	const root: slides_v1.Schema$PageElement = {
		objectId: "talk-cards",
		size: title.size,
		transform: {
			scaleX: 1,
			scaleY: 1,
			translateX: 40,
			translateY: 50,
			unit: "PT",
		},
		elementGroup: { children: [title, manual] },
	};
	const presentation: slides_v1.Schema$Presentation = {
		presentationId: "deck",
		revisionId: "rev1",
		slides: [
			{
				objectId: "talk-page",
				pageElements: mode === "slide" ? [title, manual] : [root],
			},
			{
				objectId: "outside-page",
				pageElements: [
					{
						objectId: "outside-text",
						shape: {
							text: {
								textElements: [{ textRun: { content: "Organizer notes\n" } }],
							},
						},
					},
				],
			},
		],
	};
	const composition = new GoogleSlidesContentRepositoryComposition();
	const contract = composition
		.definition()
		.read(presentation, "slides", templateDefaults);
	const field = contract?.fields[0];
	if (!contract || field?.type !== "collection")
		throw new Error("Expected collection");
	return { presentation, title, manual, root, composition, contract, field };
}
