import { describe, expect, it } from "vitest";
import {
	PublicationDomainComposition,
	type ContentManifest,
	type PublicAssetModel,
} from "@meetup-automation/publication";
import { collectionFixture } from "../../packages/adapter/publication/google-slides-content-repository/testing/collections.fixtures.js";
import { NativeSlidesFixture } from "../../packages/adapter/publication/google-slides-content-repository/testing/native-slides.fixture.js";
import { templateDefaults } from "../../packages/adapter/publication/google-slides-content-repository/testing/slides.fixtures.js";

function fixture(mode: "slide" | "grid") {
	const f = collectionFixture(mode);
	const api = new NativeSlidesFixture(f.presentation);
	const client = {
		presentations: {
			get: () => api.get(),
			batchUpdate: (input: Parameters<NativeSlidesFixture["batchUpdate"]>[0]) =>
				api.batchUpdate(input),
		},
	} as unknown as Parameters<
		typeof f.composition.googleSlidesContentRepository
	>[0];
	const images = {
		validate: async (source: { url: string; description: string }) => ({
			source,
			fingerprint: source.url,
		}),
		observe: async (url: string) => url,
	};
	let manifest: ContentManifest | undefined;
	const repository = f.composition.googleSlidesContentRepository(
		client,
		images,
	);
	const domain = new PublicationDomainComposition();
	const service = domain.reconcileAssetContent(
		{ value: (value) => value.value },
		{
			load: async () => manifest,
			save: async (_folder, value) => {
				manifest = structuredClone(value);
			},
		},
		{ "application/vnd.google-apps.presentation": repository },
		images,
		templateDefaults,
	);
	const input = {
		folderId: "event",
		fileId: "deck",
		templateId: "template",
		kind: "slides",
		mimeType: "application/vnd.google-apps.presentation",
		contract: f.contract,
		fresh: true,
		managed: true,
	};
	const model = (titles: string[]): PublicAssetModel => ({
		text: Object.fromEntries(
			titles.map((title, index) => [`talk.title:${index + 1}`, title]),
		),
		pictures: {},
	});
	return { ...f, api, service, input, model, manifest: () => manifest };
}

describe("collection reconciliation", () => {
	it.each(["slide", "grid"] as const)(
		"grows, reorders and shrinks %s collections without stale content or duplicate reruns",
		async (mode) => {
			// Arrange
			const f = fixture(mode);
			const outside = structuredClone(f.presentation.slides?.[1]);
			// Act
			await f.service.execute({ ...f.input, model: f.model(["First"]) });
			await f.service.execute({
				...f.input,
				fresh: false,
				model: f.model(["Third", "First", "Second"]),
			});
			const grown = structuredClone(f.presentation);
			await f.service.execute({
				...f.input,
				fresh: false,
				model: f.model(["Second"]),
			});
			const writes = f.api.writes;
			const result = await f.service.execute({
				...f.input,
				fresh: false,
				model: f.model(["Second"]),
			});
			// Assert
			expect(result.status).toBe("ready");
			expect(JSON.stringify(grown)).toContain("Third");
			expect(JSON.stringify(grown)).toContain("First");
			expect(JSON.stringify(f.presentation)).not.toContain("First");
			expect(JSON.stringify(f.presentation)).not.toContain("Third");
			expect(f.api.writes).toBe(writes);
			expect(
				f.presentation.slides?.find((page) => page.objectId === "outside-page"),
			).toEqual(outside);
			expect(f.manifest()?.bindings).toHaveLength(1);
			expect(f.manifest()?.pending).toBeUndefined();
		},
	);
	it("preserves manual edits within an owned section and reports conflict", async () => {
		// Arrange
		const f = fixture("slide");
		await f.service.execute({ ...f.input, model: f.model(["First"]) });
		const manual =
			f.api.element("manual-label").shape?.text?.textElements?.[0].textRun;
		if (manual) manual.content = "Edited by organizer\n";
		const before = JSON.stringify(f.presentation);
		// Act
		const action = f.service.execute({
			...f.input,
			fresh: false,
			model: f.model(["Second", "Third"]),
		});
		// Assert
		await expect(action).rejects.toMatchObject({ code: "conflict" });
		expect(JSON.stringify(f.presentation)).toBe(before);
	});
	it("keeps an uncertain structural write pending for explicit recovery", async () => {
		// Arrange
		const f = fixture("slide");
		f.api.failAfterApply = true;
		// Act
		const action = f.service.execute({
			...f.input,
			model: f.model(["First", "Second", "Third"]),
		});
		// Assert
		await expect(action).rejects.toThrow("response interrupted");
		expect(f.manifest()?.pending).toBeDefined();
		expect(f.api.writes).toBe(1);
	});
	it("holds an empty agenda before creating or removing native sections", async () => {
		// Arrange
		const f = fixture("slide");
		const before = JSON.stringify(f.presentation);
		// Act
		const action = f.service.execute({ ...f.input, model: f.model([]) });
		// Assert
		await expect(action).rejects.toMatchObject({ code: "missing" });
		expect(JSON.stringify(f.presentation)).toBe(before);
		expect(f.api.writes).toBe(0);
	});
});
