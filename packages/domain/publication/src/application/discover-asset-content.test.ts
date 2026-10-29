import { describe, expect, it, vi } from "vitest";
import { contentFixture, defaults } from "../../testing/content.fixtures.js";
import { PublicationDomainComposition } from "../dependency-composition.js";
import { DiscoverAssetContent } from "./discover-asset-content.js";

describe("asset content discovery", () => {
	it("discovers new fields from the template without consumer configuration", async () => {
		// Arrange
		const f = contentFixture();
		const subject = new DiscoverAssetContent(
			{
				policy: new PublicationDomainComposition().contentManifestPolicy(),
				fields: new PublicationDomainComposition().contentTemplateFields(),
			},
			f.manifests,
			{ [f.input.mimeType]: f.renderer },
			defaults,
		);
		const template = {
			id: f.input.templateId,
			name: "Slides",
			kind: "slides",
			mimeType: f.input.mimeType,
		};
		// Act
		const actual = await subject.read("folder", template);
		// Assert
		expect(actual).toEqual(f.input.contract);
		expect(f.renderer.discover).toHaveBeenCalledWith(
			template.id,
			"slides",
			defaults,
		);
		expect(f.manifests.load).not.toHaveBeenCalled();
	});
	it("uses the frozen definition of an existing managed copy without rescanning it", async () => {
		// Arrange
		const f = contentFixture();
		await f.service.execute(f.input);
		const subject = new DiscoverAssetContent(
			{
				policy: new PublicationDomainComposition().contentManifestPolicy(),
				fields: new PublicationDomainComposition().contentTemplateFields(),
			},
			f.manifests,
			{ [f.input.mimeType]: f.renderer },
			defaults,
		);
		const template = {
			id: f.input.templateId,
			name: "Slides",
			kind: "slides",
			mimeType: f.input.mimeType,
		};
		const file = {
			id: f.input.fileId,
			name: "Slides",
			kind: "slides",
			templateId: template.id,
			mimeType: f.input.mimeType,
			contentManaged: true,
		};
		// Act
		const actual = await subject.read("folder", template, file);
		// Assert
		expect(actual).toEqual(f.input.contract);
		expect(f.renderer.discover).not.toHaveBeenCalled();
	});
	it.each([false, true])(
		"requires explicit enrollment when managed state is missing: %s",
		async (enroll) => {
			// Arrange
			const f = contentFixture();
			const subject = new DiscoverAssetContent(
				{
					policy: new PublicationDomainComposition().contentManifestPolicy(),
					fields: new PublicationDomainComposition().contentTemplateFields(),
				},
				f.manifests,
				{ [f.input.mimeType]: f.renderer },
				defaults,
			);
			const template = {
				id: f.input.templateId,
				name: "Slides",
				kind: "slides",
				mimeType: f.input.mimeType,
			};
			const file = {
				id: f.input.fileId,
				name: "Slides",
				kind: "slides",
				templateId: template.id,
				contentManaged: true,
			};
			// Act
			const result = subject.read(
				"folder",
				template,
				file,
				enroll ? { operation: "enroll", revision: "1" } : undefined,
			);
			// Assert
			if (enroll) {
				await expect(result).resolves.toEqual(f.input.contract);
				expect(f.renderer.discover).toHaveBeenCalledWith(
					file.id,
					"slides",
					defaults,
				);
			} else {
				await expect(result).rejects.toMatchObject({ code: "recovery" });
				expect(f.renderer.discover).not.toHaveBeenCalled();
			}
		},
	);
	it("propagates provider failures without falling back to copy-only", async () => {
		// Arrange
		const f = contentFixture();
		const error = new Error("Provider unavailable");
		vi.mocked(f.renderer.discover).mockRejectedValue(error);
		const subject = new DiscoverAssetContent(
			{
				policy: new PublicationDomainComposition().contentManifestPolicy(),
				fields: new PublicationDomainComposition().contentTemplateFields(),
			},
			f.manifests,
			{ [f.input.mimeType]: f.renderer },
			defaults,
		);
		// Act
		const result = subject.read("folder", {
			id: "template",
			name: "Slides",
			kind: "slides",
			mimeType: f.input.mimeType,
		});
		// Assert
		await expect(result).rejects.toBe(error);
	});
});
