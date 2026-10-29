import type { slides_v1 } from "@googleapis/slides";
import type {
	AssetImageRepository,
	ContentContract,
} from "@meetup-automation/publication";
import { vi } from "vitest";

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
			batchUpdate: vi.fn(
				async (
					_request: slides_v1.Params$Resource$Presentations$Batchupdate,
				) => ({
					data: { writeControl: { requiredRevisionId: "rev2" } },
				}),
			),
		},
	};
	const images: AssetImageRepository = {
		validate: vi.fn(),
		observe: vi.fn(async () => "embedded-bytes"),
	};
	return {
		contract,
		presentation,
		client,
		images,
		api: client as unknown as Pick<slides_v1.Slides, "presentations">,
		page: presentation.slides?.[0] as slides_v1.Schema$Page,
		firstShape: presentation.slides?.[0]
			.pageElements?.[0] as slides_v1.Schema$PageElement,
		firstRun: presentation.slides?.[0].pageElements?.[0].shape?.text
			?.textElements?.[0].textRun as slides_v1.Schema$TextRun,
	};
}

export const templateDefaults = {
	missingNextEvent: "To be announced",
	missingAbstract: "Abstract to be announced",
	speaker: {
		url: "https://images.example.test/speaker.png",
		description: "Generic speaker",
	},
	host: {
		url: "https://images.example.test/host.png",
		description: "Generic host",
	},
};
