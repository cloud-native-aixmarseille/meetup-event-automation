import { slides, type slides_v1 } from "@googleapis/slides";
import {
	type AssetContentRepository,
	type AssetImageRepository,
	type ContentBinding,
	type ContentChange,
	type ContentContract,
	type ContentSnapshot,
	ContentError,
	ContentFingerprint,
	type ObservedLocation,
} from "@meetup-automation/publication";
import { SlideTemplateBindings } from "./slide-template-bindings.js";

export class GoogleSlidesContentRepository implements AssetContentRepository {
	private current?: slides_v1.Schema$Presentation;
	constructor(
		private readonly client: Pick<slides_v1.Slides, "presentations">,
		private readonly images: AssetImageRepository,
	) {}

	static create(
		authentication: ConstructorParameters<typeof slides_v1.Slides>[0]["auth"],
		images: AssetImageRepository,
	): GoogleSlidesContentRepository {
		return new GoogleSlidesContentRepository(
			slides({ version: "v1", auth: authentication }),
			images,
		);
	}

	async read(
		fileId: string,
		contract: ContentContract,
		registered?: readonly ContentBinding[],
	): Promise<ContentSnapshot> {
		const { data } = await this.client.presentations.get(
			{ presentationId: fileId },
			{ retry: false, timeout: 30_000 },
		);
		if (!data.revisionId || data.presentationId !== fileId)
			throw new ContentError("location");
		const bindings =
			registered ?? SlideTemplateBindings.discover(data, contract);
		const locations: ObservedLocation[] = [];
		for (const binding of bindings) {
			const element = GoogleSlidesContentRepository.element(data, binding);
			let fingerprint: string;
			if (binding.type === "text") {
				if (!element.shape) throw new ContentError("conflict");
				fingerprint = ContentFingerprint.of(
					SlideTemplateBindings.text(element),
				);
			} else {
				if (!element.image?.contentUrl) throw new ContentError("conflict");
				const bytes = await this.images.observe(element.image.contentUrl);
				fingerprint = ContentFingerprint.of(
					JSON.stringify([
						bytes,
						element.image.imageProperties,
						element.description,
					]),
				);
			}
			locations.push({
				id: binding.id,
				key: binding.key,
				type: binding.type,
				anchor: binding.anchor,
				fingerprint,
			});
		}
		this.current = data;
		return { revision: data.revisionId, locations };
	}

	async apply(
		fileId: string,
		snapshot: ContentSnapshot,
		changes: readonly ContentChange[],
	): Promise<string> {
		const current = this.current;
		if (
			!current ||
			current.presentationId !== fileId ||
			current.revisionId !== snapshot.revision
		)
			throw new ContentError("revision");
		const requests = changes.flatMap((change) =>
			GoogleSlidesContentRepository.requests(current, change),
		);
		try {
			const { data } = await this.client.presentations.batchUpdate(
				{
					presentationId: fileId,
					requestBody: {
						requests,
						writeControl: { requiredRevisionId: snapshot.revision },
					},
				},
				{ retry: false, timeout: 30_000 },
			);
			return data.writeControl?.requiredRevisionId ?? "";
		} catch (error) {
			if (/revision/i.test(String((error as Error)?.message)))
				throw new ContentError("revision");
			throw new ContentError("recovery");
		}
	}

	private static requests(
		current: slides_v1.Schema$Presentation,
		change: ContentChange,
	): slides_v1.Schema$Request[] {
		const objectId = change.location.anchor.objectId;
		if (change.value.type === "image")
			return [
				{
					replaceImage: {
						imageObjectId: objectId,
						url: change.value.image?.url,
						imageReplaceMethod: change.value.fit,
					},
				},
				{
					updatePageElementAltText: {
						objectId,
						description: change.value.image?.description,
					},
				},
			];
		const element = GoogleSlidesContentRepository.element(
			current,
			change.location,
		);
		const style = SlideTemplateBindings.style(element);
		return [
			{ deleteText: { objectId, textRange: { type: "ALL" } } },
			{ insertText: { objectId, insertionIndex: 0, text: change.value.text } },
			...(Object.keys(style).length
				? [
						{
							updateTextStyle: {
								objectId,
								textRange: { type: "ALL" },
								style,
								fields: Object.keys(style).join(","),
							},
						},
					]
				: []),
		];
	}

	private static element(
		current: slides_v1.Schema$Presentation,
		binding: Pick<ContentBinding, "anchor">,
	): slides_v1.Schema$PageElement {
		const pages =
			current.slides?.filter(
				(page) => page.objectId === binding.anchor.pageId,
			) ?? [];
		const elements = pages
			.flatMap((page) => page.pageElements ?? [])
			.filter((element) => element.objectId === binding.anchor.objectId);
		if (pages.length !== 1 || elements.length !== 1)
			throw new ContentError("conflict");
		return elements[0];
	}
}
