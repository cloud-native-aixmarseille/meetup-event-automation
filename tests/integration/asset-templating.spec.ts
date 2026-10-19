import { describe, expect, it } from "vitest";
import { GoogleDocsContentRepositoryComposition } from "../../packages/adapter/publication/google-docs-content-repository/src/index.js";
import {
	docsFixture,
	paragraph,
} from "../../packages/adapter/publication/google-docs-content-repository/testing/docs.fixtures.js";
import { GoogleSlidesContentRepositoryComposition } from "../../packages/adapter/publication/google-slides-content-repository/src/index.js";
import { slidesFixture } from "../../packages/adapter/publication/google-slides-content-repository/testing/slides.fixtures.js";
import { PublicationDomainComposition } from "../../packages/domain/publication/src/index.js";
import { TemplatingComposition } from "../../packages/presentation/templating/src/index.js";
import { AssetFileNameComposition } from "../../packages/runtime/github-actions/src/asset-file-name-composition.js";
import { AssetTemplateRendererImpl } from "../../packages/runtime/github-actions/src/assets/asset-template-renderer.js";

describe("shared asset templating", () => {
	it.each(["[EVENT_DATE:D MMMM YYYY]", "{{event.date:D MMMM YYYY}}"])(
		"renders %s consistently in filenames and owned slide shapes",
		async (expression) => {
			// Arrange
			const f = slidesFixture();
			const publication = new PublicationDomainComposition();
			const field = {
				type: "text",
				token: "event.date",
				format: "D MMMM YYYY",
				required: true,
			} as const;
			const contract = publication
				.contentContractPolicy()
				.parse(
					{ ...f.contract, fields: [...f.contract.fields, field] },
					"slides",
					"application/vnd.google-apps.presentation",
				);
			f.firstRun.content = `${expression}\n`;
			const repository =
				new GoogleSlidesContentRepositoryComposition().googleSlidesContentRepository(
					f.api,
					f.images,
				);
			const values = publication.resolveContentValues(
				new AssetTemplateRendererImpl(
					new TemplatingComposition().renderer("fr"),
				),
				f.images,
			);
			const names = new AssetFileNameComposition().create("fr");
			// Act
			const filename = names.render(`${expression} - Slides`, "2027-04-05");
			const resolved = await values.execute(contract, {
				text: { "event.title": "Community" },
				dates: { "event.date": "2027-04-05" },
				pictures: {},
			});
			const snapshot = await repository.read("file", contract);
			const key = publication.contentTextKey().of(field);
			const value = resolved.find((value) => value.key === key);
			const location = snapshot.locations.find(
				(location) => location.key === key,
			);
			if (!value || !location)
				throw new Error("Missing formatted fixture binding");
			await repository.apply("file", snapshot, [{ location, value }]);
			f.firstRun.content = `${value.text}\n`;
			const reread = await repository.read(
				"file",
				contract,
				snapshot.locations.map((item) => ({
					...item,
					applied: item.fingerprint,
				})),
			);
			// Assert
			expect(filename).toBe("5 avril 2027 - Slides");
			expect(value.text).toBe("5 avril 2027");
			expect(
				reread.locations.find((item) => item.id === location.id),
			).toMatchObject({ key, fingerprint: value.fingerprint });
			expect(f.client.presentations.batchUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					requestBody: expect.objectContaining({
						writeControl: { requiredRevisionId: "rev1" },
						requests: expect.arrayContaining([
							{
								insertText: {
									objectId: "title",
									insertionIndex: 0,
									text: "5 avril 2027",
								},
							},
						]),
					}),
				}),
				{ retry: false, timeout: 30_000 },
			);
		},
	);

	it("binds mixed syntax in Docs prose with exact Unicode ranges", async () => {
		// Arrange
		const f = docsFixture();
		const publication = new PublicationDomainComposition();
		const field = {
			type: "text",
			token: "event.date",
			format: "DD/MM/YYYY",
			required: true,
		} as const;
		const contract = publication
			.contentContractPolicy()
			.parse(
				{ ...f.contract, fields: [field] },
				"document",
				"application/vnd.google-apps.document",
			);
		const text = "🚀 [EVENT_DATE:DD/MM/YYYY] / {{event.date:DD/MM/YYYY}}\n";
		f.rootContent.body = { content: [paragraph(text)] };
		f.childContent.body = { content: [] };
		const repository =
			new GoogleDocsContentRepositoryComposition().googleDocsContentRepository(
				f.api,
				f.images,
			);
		const resolver = publication.resolveContentValues(
			new AssetTemplateRendererImpl(new TemplatingComposition().renderer("en")),
			f.images,
		);
		// Act
		const [value] = await resolver.execute(contract, {
			text: {},
			dates: { "event.date": "2027-04-05" },
			pictures: {},
		});
		const snapshot = await repository.read("file", contract);
		await repository.apply(
			"file",
			snapshot,
			snapshot.locations.map((location) => ({ location, value })),
		);
		// Assert
		expect(value.text).toBe("05/04/2027");
		expect(snapshot.locations).toHaveLength(2);
		expect(snapshot.locations[0].anchor.start).toBe(4);
		expect(
			snapshot.locations.map(({ anchor }) =>
				text.slice((anchor.start ?? 0) - 1, (anchor.end ?? 0) - 1),
			),
		).toEqual(["[EVENT_DATE:DD/MM/YYYY]", "{{event.date:DD/MM/YYYY}}"]);
		expect(f.client.documents.batchUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				requestBody: expect.objectContaining({
					requests: expect.arrayContaining([
						expect.objectContaining({
							insertText: expect.objectContaining({ text: "05/04/2027" }),
						}),
					]),
				}),
			}),
			{ retry: false, timeout: 30_000 },
		);
	});
});
