import { describe, expect, it } from "vitest";
import {
	contract,
	defaults,
	mimeType,
} from "../../testing/content.fixtures.js";
import { PublicationDomainComposition } from "../dependency-composition.js";
import type { ImageField, TextField } from "./asset-content.js";
import { ContentTemplateFields } from "./content-template-fields.js";

function subject() {
	const domain = new PublicationDomainComposition();
	return new ContentTemplateFields(
		domain.contentContractPolicy(),
		domain.contentTextKey(),
		domain.contentFingerprint(),
	);
}

describe("template field policy", () => {
	it("recognizes event start time as a required scalar template field", () => {
		// Arrange
		const fields = subject();

		// Act
		const field = fields.text("event.start_time", undefined, defaults);
		const parsed = fields.contract("slides", mimeType, [field]);

		// Assert
		expect(parsed?.fields).toEqual([
			{ type: "text", token: "event.start_time", required: true },
		]);
	});
	it.each<TextField | ImageField>([
		{ type: "text", token: "speaker.name", slot: "portrait-a", required: true },
		{
			type: "image",
			token: "speaker.picture",
			slot: "portrait-a",
			objectId: "image",
			pageId: "page",
			fit: "CENTER_CROP",
			required: false,
			fallback: defaults.speaker,
		},
	])("blocks obsolete saved selectors before resolving values", (field) => {
		// Arrange
		const fields = subject();
		// Act
		let error: unknown;
		try {
			fields.validateSelectors({ ...contract, fields: [field] });
		} catch (caught) {
			error = caught;
		}
		// Assert
		expect(error).toMatchObject({ code: "contract" });
	});
	it.each([false, true])(
		"rejects image/text key collisions regardless of order: %s",
		(reverse) => {
			// Arrange
			const fields = subject();
			const text = fields.text("event.title", undefined, defaults);
			const image = fields.image(
				"host.logo",
				undefined,
				{ objectId: "event.title", pageId: "page" },
				defaults,
			);
			// Act
			let error: unknown;
			try {
				fields.contract(
					"slides",
					mimeType,
					reverse ? [image, text] : [text, image],
				);
			} catch (caught) {
				error = caught;
			}
			// Assert
			expect(error).toMatchObject({ code: "contract" });
		},
	);
});
