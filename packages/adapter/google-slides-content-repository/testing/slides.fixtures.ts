import type { slides_v1 } from "@googleapis/slides";
import { vi } from "vitest";
import type {
	AssetImageRepository,
	ContentContract,
} from "@meetup-automation/publication";
import { GoogleSlidesContentRepository } from "../src/google-slides-content-repository.js";

export function slidesFixture() {
	const contract: ContentContract = {
		version: 1,
		revision: "one",
		kind: "slides",
		fields: [{ type: "text", token: "event.title", required: true }],
	};
	const shape = (id: string): slides_v1.Schema$PageElement => ({
		objectId: id,
		shape: {
			text: {
				textElements: [
					{
						textRun: {
							content: "{{event.title}}\n",
							style: { bold: true, fontSize: { magnitude: 24, unit: "PT" } },
						},
					},
				],
			},
		},
	});
	const presentation: slides_v1.Schema$Presentation = {
		presentationId: "file",
		revisionId: "rev1",
		slides: [
			{
				objectId: "page",
				pageElements: [
					shape("title"),
					shape("repeat"),
					{
						objectId: "manual",
						shape: {
							text: {
								textElements: [{ textRun: { content: "Manual work\n" } }],
							},
						},
					},
				],
			},
		],
	};
	const client = {
		presentations: {
			get: vi.fn(async () => ({ data: presentation })),
			batchUpdate: vi.fn(async () => ({
				data: { writeControl: { requiredRevisionId: "rev2" } },
			})),
		},
	};
	const images: AssetImageRepository = {
		validate: vi.fn(),
		observe: vi.fn(async () => "embedded-bytes"),
	};
	const repository = new GoogleSlidesContentRepository(
		client as unknown as Pick<slides_v1.Slides, "presentations">,
		images,
	);
	return {
		contract,
		presentation,
		client,
		images,
		repository,
		page: presentation.slides?.[0] as slides_v1.Schema$Page,
		firstShape: presentation.slides?.[0]
			.pageElements?.[0] as slides_v1.Schema$PageElement,
		firstRun: presentation.slides?.[0].pageElements?.[0].shape?.text
			?.textElements?.[0].textRun as slides_v1.Schema$TextRun,
	};
}
