import { PublicationDomainComposition } from "@meetup-automation/publication";
import { describe, expect, it } from "vitest";
import { slidesFixture } from "../testing/slides.fixtures.js";
import { GoogleSlidesContentRepositoryComposition } from "./dependency-composition.js";

import { GoogleSlidesContentRepository } from "./google-slides-content-repository.js";

describe("Slides content repository", () => {
	it("propagates an unexpected provider write failure for technical reporting", async () => {
		// Arrange
		const f = slidesFixture();
		const repository = new GoogleSlidesContentRepository(
			{
				slideTemplateBindings:
					new GoogleSlidesContentRepositoryComposition().slideTemplateBindings(),
				slideContentRequests:
					new GoogleSlidesContentRepositoryComposition().slideContentRequests(),
				createSlideContentLocations: (...args) =>
					new GoogleSlidesContentRepositoryComposition().slideContentLocations(
						...args,
					),
			},
			f.api,
			f.images,
		);
		const error = new Error("Synthetic authentication failure");
		const snapshot = await repository.read("file", f.contract);
		f.client.presentations.batchUpdate.mockRejectedValueOnce(error);

		// Act
		const result = repository.apply("file", snapshot, [
			{
				location: snapshot.locations[0],
				value: {
					type: "text",
					key: "event.title",
					text: "Public meetup",
					fingerprint: new PublicationDomainComposition()
						.contentFingerprint()
						.of("Public meetup"),
				},
			},
		]);

		// Assert
		await expect(result).rejects.toBe(error);
		expect(f.client.presentations.batchUpdate).toHaveBeenCalledOnce();
	});

	it("renders a slotted talk title and follows its shape after the placeholder disappears", async () => {
		// Arrange
		const f = slidesFixture();
		const repository = new GoogleSlidesContentRepository(
			{
				slideTemplateBindings:
					new GoogleSlidesContentRepositoryComposition().slideTemplateBindings(),
				slideContentRequests:
					new GoogleSlidesContentRepositoryComposition().slideContentRequests(),
				createSlideContentLocations: (...args) =>
					new GoogleSlidesContentRepositoryComposition().slideContentLocations(
						...args,
					),
			},
			f.api,
			f.images,
		);
		const contract = {
			...f.contract,
			fields: [
				...f.contract.fields,
				{
					type: "text",
					token: "talk.title",
					slot: "opening",
					required: true,
				} as const,
			],
		};
		f.firstRun.content = "{{talk.title:opening}}\n";

		// Act
		const initial = await repository.read("file", contract);
		const location = initial.locations.find(
			(item) => item.key === "talk.title:opening",
		);
		if (!location) throw new Error("Missing talk fixture binding");
		await repository.apply("file", initial, [
			{
				location,
				value: {
					type: "text",
					key: location.key,
					text: "Public talk",
					fingerprint: new PublicationDomainComposition()
						.contentFingerprint()
						.of("Public talk"),
				},
			},
		]);
		f.firstRun.content = "Public talk\n";
		const updated = await repository.read(
			"file",
			contract,
			initial.locations.map((item) => ({ ...item, applied: item.fingerprint })),
		);

		// Assert
		expect(updated.locations.find((item) => item.id === "title")).toMatchObject(
			{
				key: "talk.title:opening",
				fingerprint: new PublicationDomainComposition()
					.contentFingerprint()
					.of("Public talk"),
			},
		);
		expect(f.client.presentations.batchUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				requestBody: expect.objectContaining({
					requests: expect.arrayContaining([
						{
							insertText: {
								objectId: "title",
								insertionIndex: 0,
								text: "Public talk",
							},
						},
					]),
				}),
			}),
			{ retry: false, timeout: 30_000 },
		);
	});

	it("binds repeated whole-shape tokens and preserves manual shapes and text style", async () => {
		// Arrange
		const f = slidesFixture();
		const repository = new GoogleSlidesContentRepository(
			{
				slideTemplateBindings:
					new GoogleSlidesContentRepositoryComposition().slideTemplateBindings(),
				slideContentRequests:
					new GoogleSlidesContentRepositoryComposition().slideContentRequests(),
				createSlideContentLocations: (...args) =>
					new GoogleSlidesContentRepositoryComposition().slideContentLocations(
						...args,
					),
			},
			f.api,
			f.images,
		);
		const snapshot = await repository.read("file", f.contract);

		// Act
		const revision = await repository.apply(
			"file",
			snapshot,
			snapshot.locations.map((location) => ({
				location,
				value: {
					type: "text",
					key: "event.title",
					text: "Literal {{agenda}}",
					fingerprint: new PublicationDomainComposition()
						.contentFingerprint()
						.of("Literal {{agenda}}"),
				},
			})),
		);
		const request = f.client.presentations.batchUpdate.mock.calls[0];

		// Assert
		expect(snapshot.locations.map((location) => location.id)).toEqual([
			"title",
			"repeat",
		]);
		expect(revision).toBe("rev2");
		expect(request[0]).toMatchObject({
			presentationId: "file",
			requestBody: { writeControl: { requiredRevisionId: "rev1" } },
		});
		expect(JSON.stringify(request)).not.toContain("manual");
		expect(JSON.stringify(request)).not.toContain("replaceAllText");
		expect(JSON.stringify(request)).toContain("updateTextStyle");
		expect(JSON.stringify(request)).toContain("Literal {{agenda}}");
	});

	it("rejects mixed prose before any batch", async () => {
		// Arrange
		const f = slidesFixture();
		const repository = new GoogleSlidesContentRepository(
			{
				slideTemplateBindings:
					new GoogleSlidesContentRepositoryComposition().slideTemplateBindings(),
				slideContentRequests:
					new GoogleSlidesContentRepositoryComposition().slideContentRequests(),
				createSlideContentLocations: (...args) =>
					new GoogleSlidesContentRepositoryComposition().slideContentLocations(
						...args,
					),
			},
			f.api,
			f.images,
		);
		f.firstRun.content = "Welcome {{event.title}}\n";

		// Act
		const result = repository.read("file", f.contract);

		// Assert
		await expect(result).rejects.toMatchObject({ code: "location" });
		expect(f.client.presentations.batchUpdate).not.toHaveBeenCalled();
	});

	it("rejects tokens in speaker notes", async () => {
		// Arrange
		const f = slidesFixture();
		const repository = new GoogleSlidesContentRepository(
			{
				slideTemplateBindings:
					new GoogleSlidesContentRepositoryComposition().slideTemplateBindings(),
				slideContentRequests:
					new GoogleSlidesContentRepositoryComposition().slideContentRequests(),
				createSlideContentLocations: (...args) =>
					new GoogleSlidesContentRepositoryComposition().slideContentLocations(
						...args,
					),
			},
			f.api,
			f.images,
		);
		f.page.slideProperties = {
			notesPage: { pageElements: [f.firstShape] },
		};

		// Act
		const result = repository.read("file", f.contract);

		// Assert
		await expect(result).rejects.toMatchObject({ code: "location" });
	});

	it.each(["speaker.picture", "host.logo"] as const)(
		"observes embedded bytes independently of temporary delivery URLs and replaces registered %s images in place",
		async (token) => {
			// Arrange
			const f = slidesFixture();
			const repository = new GoogleSlidesContentRepository(
				{
					slideTemplateBindings:
						new GoogleSlidesContentRepositoryComposition().slideTemplateBindings(),
					slideContentRequests:
						new GoogleSlidesContentRepositoryComposition().slideContentRequests(),
					createSlideContentLocations: (...args) =>
						new GoogleSlidesContentRepositoryComposition().slideContentLocations(
							...args,
						),
				},
				f.api,
				f.images,
			);
			const field = {
				type: "image",
				token,
				slot: "portrait",
				objectId: "portrait",
				pageId: "page",
				required: false,
				fallback: {
					url: "https://images.example.org/generic.png",
					description: "Portrait",
				},
				fit: "CENTER_INSIDE",
			} as const;
			const contract = { ...f.contract, fields: [field] };
			f.page.pageElements = [
				{
					objectId: "portrait",
					description: "Speaker portrait",
					image: {
						contentUrl: "https://images.googleusercontent.com/temporary-one",
						sourceUrl: "https://images.example.org/source.png",
					},
				},
			];
			const snapshot = await repository.read("file", contract);
			const portrait = f.page.pageElements?.[0].image;
			if (!portrait) throw new Error("Missing image fixture");
			portrait.contentUrl =
				"https://images.googleusercontent.com/temporary-two";

			// Act
			const second = await repository.read(
				"file",
				contract,
				snapshot.locations.map((location) => ({
					...location,
					applied: location.fingerprint,
				})),
			);
			await repository.apply("file", second, [
				{
					location: second.locations[0],
					value: {
						type: "image",
						key: "portrait",
						fingerprint: "new",
						image: {
							url: "https://images.example.org/new.png",
							description: "Public speaker",
						},
						fit: "CENTER_INSIDE",
					},
				},
			]);

			// Assert
			expect(second.locations[0].fingerprint).toBe(
				snapshot.locations[0].fingerprint,
			);
			expect(f.images.observe).toHaveBeenCalledTimes(2);
			expect(f.client.presentations.batchUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					requestBody: expect.objectContaining({
						requests: [
							{
								replaceImage: {
									imageObjectId: "portrait",
									url: "https://images.example.org/new.png",
									imageReplaceMethod: "CENTER_INSIDE",
								},
							},
							{
								updatePageElementAltText: {
									objectId: "portrait",
									description: "Public speaker",
								},
							},
						],
					}),
				}),
				{ retry: false, timeout: 30_000 },
			);
		},
	);
});
