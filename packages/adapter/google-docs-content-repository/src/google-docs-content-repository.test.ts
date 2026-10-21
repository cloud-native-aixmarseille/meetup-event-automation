import { ContentFingerprint } from "@meetup-automation/publication";
import { describe, expect, it } from "vitest";
import { docsFixture, paragraph } from "../testing/docs.fixtures.js";

import { GoogleDocsContentRepository } from "./google-docs-content-repository.js";

describe("Docs content repository", () => {
	it("propagates an unexpected provider write failure for technical reporting", async () => {
		// Arrange
		const f = docsFixture();
		const repository = new GoogleDocsContentRepository(f.api, f.images);
		const error = new Error("Synthetic authentication failure");
		const snapshot = await repository.read("file", f.contract);
		f.client.documents.batchUpdate.mockRejectedValueOnce(error);

		// Act
		const result = repository.apply("file", snapshot, [
			{
				location: snapshot.locations[0],
				value: {
					type: "text",
					key: "event.title",
					text: "Public meetup",
					fingerprint: ContentFingerprint.of("Public meetup"),
				},
			},
		]);

		// Assert
		await expect(result).rejects.toBe(error);
		expect(f.client.documents.batchUpdate).toHaveBeenCalledOnce();
	});

	it("binds and renders slotted speaker names in body prose", async () => {
		// Arrange
		const f = docsFixture();
		const repository = new GoogleDocsContentRepository(f.api, f.images);
		const contract = {
			...f.contract,
			fields: [
				...f.contract.fields,
				{
					type: "text",
					token: "speaker.name",
					slot: "portrait",
					required: true,
				} as const,
			],
		};
		f.rootContent.body = {
			content: [paragraph("Welcome {{speaker.name:portrait}}\n")],
		};

		// Act
		const snapshot = await repository.read("file", contract);
		const location = snapshot.locations.find(
			(item) => item.key === "speaker.name:portrait",
		);
		if (!location) throw new Error("Missing speaker fixture binding");
		await repository.apply("file", snapshot, [
			{
				location,
				value: {
					type: "text",
					key: location.key,
					text: "Public Speaker",
					fingerprint: ContentFingerprint.of("Public Speaker"),
				},
			},
		]);

		// Assert
		expect(location.anchor).toMatchObject({
			tabId: "tab-one",
			start: 9,
			end: 34,
		});
		expect(f.client.documents.batchUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				requestBody: expect.objectContaining({
					requests: expect.arrayContaining([
						{
							insertText: {
								location: { index: 9, tabId: "tab-one", segmentId: "" },
								text: "Public Speaker",
							},
						},
						{
							createNamedRange: {
								name: location.id,
								range: {
									startIndex: 9,
									endIndex: 23,
									tabId: "tab-one",
									segmentId: "",
								},
							},
						},
					]),
				}),
			}),
			{ retry: false, timeout: 30_000 },
		);
	});

	it("registers repeated body tokens across nested tabs with UTF-16 indices and one revision-controlled batch", async () => {
		// Arrange
		const f = docsFixture();
		const repository = new GoogleDocsContentRepository(f.api, f.images);
		const snapshot = await repository.read("file", f.contract);

		// Act
		await repository.apply(
			"file",
			snapshot,
			snapshot.locations.map((location) => ({
				location,
				value: {
					type: "text",
					key: "event.title",
					text: "Meetup 🚀",
					fingerprint: ContentFingerprint.of("Meetup 🚀"),
				},
			})),
		);

		// Assert
		expect(snapshot.locations.map((location) => location.anchor.tabId)).toEqual(
			["tab-one", "tab-one", "tab-two"],
		);
		expect(f.client.documents.get).toHaveBeenCalledWith(
			{
				documentId: "file",
				includeTabsContent: true,
				suggestionsViewMode: "SUGGESTIONS_INLINE",
			},
			{ retry: false, timeout: 30_000 },
		);
		expect(f.client.documents.batchUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				requestBody: expect.objectContaining({
					writeControl: { requiredRevisionId: "rev1" },
					requests: expect.arrayContaining([
						{
							createNamedRange: {
								name: "meetup_tab-two_1",
								range: {
									tabId: "tab-two",
									segmentId: "",
									startIndex: 1,
									endIndex: 10,
								},
							},
						},
					]),
				}),
			}),
			{ retry: false, timeout: 30_000 },
		);
	});

	it("follows a named range after surrounding content moves", async () => {
		// Arrange
		const f = docsFixture();
		const repository = new GoogleDocsContentRepository(f.api, f.images);
		f.root.documentTab = {
			body: { content: [paragraph("Manual prefix Public title\n")] },
			namedRanges: {
				managed: {
					namedRanges: [
						{
							namedRangeId: "range-id",
							ranges: [{ tabId: "tab-one", startIndex: 15, endIndex: 27 }],
						},
					],
				},
			},
		};

		// Act
		const snapshot = await repository.read("file", f.contract, [
			{
				id: "managed",
				type: "text",
				key: "event.title",
				applied: "previous",
				anchor: {
					tabId: "tab-one",
					rangeName: "managed",
					start: 1,
					end: 4,
					segmentId: "",
				},
			},
		]);

		// Assert
		expect(snapshot.locations[0].anchor.start).toBe(15);
		expect(snapshot.locations[0].fingerprint).toBe(
			ContentFingerprint.of("Public title"),
		);
	});

	it("requires recovery when a registered range is absent instead of searching its old text", async () => {
		// Arrange
		const f = docsFixture();
		const repository = new GoogleDocsContentRepository(f.api, f.images);

		// Act
		const result = repository.read("file", f.contract, [
			{
				id: "managed",
				type: "text",
				key: "event.title",
				applied: "previous",
				anchor: {
					tabId: "tab-one",
					rangeName: "missing",
					start: 1,
					end: 5,
					segmentId: "",
				},
			},
		]);

		// Assert
		await expect(result).rejects.toMatchObject({ code: "conflict" });
		expect(f.client.documents.batchUpdate).not.toHaveBeenCalled();
	});

	it("rejects table tokens before partially rendering supported paragraphs", async () => {
		// Arrange
		const f = docsFixture();
		const repository = new GoogleDocsContentRepository(f.api, f.images);
		f.rootContent.body?.content?.push({
			table: {
				tableRows: [
					{ tableCells: [{ content: [paragraph("{{host.name}}\n")] }] },
				],
			},
		});

		// Act
		const result = repository.read("file", f.contract);

		// Assert
		await expect(result).rejects.toMatchObject({ code: "location" });
		expect(f.client.documents.batchUpdate).not.toHaveBeenCalled();
	});

	it.each(["speaker.picture", "host.logo"] as const)(
		"replaces the bound %s image in its tab with explicit center crop",
		async (token) => {
			// Arrange
			const f = docsFixture();
			const repository = new GoogleDocsContentRepository(f.api, f.images);
			const tab = f.childContent;
			tab.body = {
				content: [
					{
						startIndex: 1,
						paragraph: {
							elements: [
								{
									startIndex: 1,
									endIndex: 2,
									inlineObjectElement: { inlineObjectId: "portrait" },
								},
							],
						},
					},
				],
			};
			tab.inlineObjects = {
				portrait: {
					inlineObjectProperties: {
						embeddedObject: {
							description: "Speaker portrait",
							imageProperties: {
								contentUri: "https://images.googleusercontent.com/temporary",
							},
						},
					},
				},
			};
			const contract = {
				...f.contract,
				fields: [
					{
						type: "image",
						token,
						slot: "p".repeat(100),
						objectId: "portrait",
						tabId: "tab-two",
						required: true,
						fit: "CENTER_CROP",
					},
				],
			} as const;
			f.rootContent.body = {
				content: [paragraph("Manual prose\n")],
			};
			const snapshot = await repository.read("file", contract);

			// Act
			await repository.apply("file", snapshot, [
				{
					location: snapshot.locations[0],
					value: {
						type: "image",
						key: "p".repeat(100),
						fingerprint: "new",
						image: {
							url: "https://images.example.org/new.png",
							description: "Public speaker",
						},
						fit: "CENTER_CROP",
					},
				},
			]);

			// Assert
			expect(snapshot.locations[0].id.length).toBeLessThanOrEqual(100);
			expect(f.client.documents.batchUpdate).toHaveBeenCalledWith(
				{
					documentId: "file",
					requestBody: {
						writeControl: { requiredRevisionId: "rev1" },
						requests: [
							{
								replaceImage: {
									imageObjectId: "portrait",
									uri: "https://images.example.org/new.png",
									tabId: "tab-two",
									imageReplaceMethod: "CENTER_CROP",
								},
							},
						],
					},
				},
				{ retry: false, timeout: 30_000 },
			);
			expect(f.images.observe).toHaveBeenCalledWith(
				"https://images.googleusercontent.com/temporary",
			);
		},
	);
});
