import { PublicationDomainComposition } from "@meetup-automation/publication";
import { TemplatingComposition } from "@meetup-automation/templating";
import { describe, expect, it } from "vitest";
import {
	docsFixture,
	paragraph,
	templateDefaults,
} from "../testing/docs.fixtures.js";
import { GoogleDocsContentRepositoryComposition } from "./dependency-composition.js";
import { DocumentTemplateDefinition } from "./document-template-definition.js";

function definition() {
	return new DocumentTemplateDefinition(
		new TemplatingComposition().parser(),
		new PublicationDomainComposition().contentTemplateFields(),
		new GoogleDocsContentRepositoryComposition().documentTemplateBindings(),
	);
}

describe("Docs template discovery", () => {
	it("discovers distinct fields across nested tabs and image alt titles", () => {
		// Arrange
		const f = docsFixture();
		f.rootContent.body = {
			content: [paragraph("Welcome {{speaker.name:1}} and [SPEAKER_NAME:1]\n")],
		};
		f.rootContent.inlineObjects = {
			portrait: {
				inlineObjectProperties: {
					embeddedObject: {
						title: "[SPEAKER_PICTURE:1]",
						description: "Portrait",
						imageProperties: {},
					},
				},
			},
		};
		const tabs = new GoogleDocsContentRepositoryComposition()
			.documentTabs()
			.all(f.document);
		const subject = definition();
		// Act
		const contract = subject.read(tabs, "document", templateDefaults);
		// Assert
		expect(contract?.fields).toEqual([
			{ type: "text", token: "speaker.name", slot: "1", required: true },
			{
				type: "image",
				token: "speaker.picture",
				sourceSlot: "1",
				slot: "portrait",
				objectId: "portrait",
				tabId: "tab-one",
				required: false,
				fit: "CENTER_CROP",
				fallback: templateDefaults.speaker,
			},
			{ type: "text", token: "event.title", required: true },
		]);
	});
	it.each([
		"{{speaker.email:1}}",
		"{{talk.title:0}}",
		"{{host.name:1}}",
		"{{event.title",
	])("rejects invalid text field %s", (marker) => {
		// Arrange
		const f = docsFixture();
		f.rootContent.body = { content: [paragraph(marker)] };
		const tabs = new GoogleDocsContentRepositoryComposition()
			.documentTabs()
			.all(f.document);
		const subject = definition();
		// Act
		let error: unknown;
		try {
			subject.read(tabs, "document", templateDefaults);
		} catch (caught) {
			error = caught;
		}
		// Assert
		expect(error).toMatchObject({ name: "ContentError" });
	});
	it("rejects markers in headers", () => {
		// Arrange
		const f = docsFixture();
		f.rootContent.headers = {
			header: { content: [paragraph("{{event.title}}\n")] },
		};
		const tabs = new GoogleDocsContentRepositoryComposition()
			.documentTabs()
			.all(f.document);
		const subject = definition();
		// Act
		let error: unknown;
		try {
			subject.read(tabs, "document", templateDefaults);
		} catch (caught) {
			error = caught;
		}
		// Assert
		expect(error).toMatchObject({ code: "location" });
	});
});
