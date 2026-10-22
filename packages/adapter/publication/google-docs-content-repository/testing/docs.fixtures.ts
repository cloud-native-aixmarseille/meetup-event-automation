import type { docs_v1 } from "@googleapis/docs";
import type {
	AssetImageRepository,
	ContentContract,
} from "@meetup-automation/publication";
import { vi } from "vitest";

export function paragraph(
	text: string,
	start = 1,
): docs_v1.Schema$StructuralElement {
	return {
		startIndex: start,
		endIndex: start + text.length,
		paragraph: {
			elements: [
				{
					startIndex: start,
					endIndex: start + text.length,
					textRun: { content: text, textStyle: { bold: true } },
				},
			],
		},
	};
}

export function docsFixture() {
	const contract: ContentContract = {
		version: 1,
		revision: "one",
		kind: "document",
		fields: [{ type: "text", token: "event.title", required: true }],
	};
	const document: docs_v1.Schema$Document = {
		documentId: "file",
		revisionId: "rev1",
		tabs: [
			{
				tabProperties: { tabId: "tab-one" },
				documentTab: {
					body: {
						content: [paragraph("Hello {{event.title}} and {{event.title}}\n")],
					},
				},
				childTabs: [
					{
						tabProperties: { tabId: "tab-two" },
						documentTab: {
							body: { content: [paragraph("{{event.title}}\n")] },
						},
					},
				],
			},
		],
	};
	const client = {
		documents: {
			get: vi.fn(async () => ({ data: document })),
			batchUpdate: vi.fn(async () => ({
				data: { writeControl: { requiredRevisionId: "rev2" } },
			})),
		},
	};
	const images: AssetImageRepository = {
		validate: vi.fn(),
		observe: vi.fn(async () => "embedded-bytes"),
	};
	return {
		contract,
		document,
		client,
		images,
		api: client as unknown as Pick<docs_v1.Docs, "documents">,
		root: document.tabs?.[0] as docs_v1.Schema$Tab,
		rootContent: document.tabs?.[0].documentTab as docs_v1.Schema$DocumentTab,
		childContent: document.tabs?.[0].childTabs?.[0]
			.documentTab as docs_v1.Schema$DocumentTab,
	};
}
