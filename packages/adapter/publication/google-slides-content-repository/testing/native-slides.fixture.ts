import type { slides_v1 } from "@googleapis/slides";

/** Small provider double for collection lifecycle tests; rejects unimplemented writes. */
export class NativeSlidesFixture {
	private revision = 1;
	failAfterApply = false;
	writes = 0;
	constructor(readonly data: slides_v1.Schema$Presentation) {}
	async get() {
		return { data: structuredClone(this.data) };
	}
	async batchUpdate(
		input: slides_v1.Params$Resource$Presentations$Batchupdate,
	) {
		if (
			input.requestBody?.writeControl?.requiredRevisionId !==
			this.data.revisionId
		)
			throw new Error("revision mismatch");
		for (const request of input.requestBody?.requests ?? [])
			this.apply(request);
		this.writes++;
		this.data.revisionId = `rev${++this.revision}`;
		if (this.failAfterApply) throw new Error("response interrupted");
		return {
			data: { writeControl: { requiredRevisionId: this.data.revisionId } },
		};
	}
	private apply(request: slides_v1.Schema$Request) {
		if (request.duplicateObject) return this.duplicate(request.duplicateObject);
		if (request.deleteObject) {
			this.remove(this.data, request.deleteObject.objectId ?? "");
			return;
		}
		if (request.deleteText) {
			const element = this.element(request.deleteText.objectId);
			if (element.shape?.text?.textElements?.[0].textRun)
				element.shape.text.textElements[0].textRun.content = "\n";
			return;
		}
		if (request.insertText) {
			const element = this.element(request.insertText.objectId);
			if (element.shape?.text?.textElements?.[0].textRun)
				element.shape.text.textElements[0].textRun.content = `${request.insertText.text}\n`;
			return;
		}
		if (request.updateTextStyle) return;
		if (request.updatePageElementTransform) {
			this.element(request.updatePageElementTransform.objectId).transform =
				request.updatePageElementTransform.transform;
			return;
		}
		if (request.replaceImage) {
			this.element(request.replaceImage.imageObjectId).image = {
				contentUrl: request.replaceImage.url,
			};
			return;
		}
		if (request.updatePageElementAltText) {
			this.element(request.updatePageElementAltText.objectId).description =
				request.updatePageElementAltText.description;
			return;
		}
		throw new Error("Unsupported fixture request");
	}
	private duplicate(request: slides_v1.Schema$DuplicateObjectRequest) {
		const source = this.find(this.data, request.objectId ?? "");
		if (!source) throw new Error("Missing duplicate source");
		const copy = this.rename(structuredClone(source), request.objectIds ?? {});
		const pageIndex =
			this.data.slides?.findIndex(
				(page) => page.objectId === request.objectId,
			) ?? -1;
		if (pageIndex >= 0)
			this.data.slides?.splice(pageIndex + 1, 0, copy as slides_v1.Schema$Page);
		else {
			const page = this.data.slides?.find((page) =>
				page.pageElements?.some(
					(element) => element.objectId === request.objectId,
				),
			);
			if (!page) throw new Error("Missing group page");
			page.pageElements?.push(copy as slides_v1.Schema$PageElement);
		}
	}
	private rename(value: unknown, ids: Record<string, string>): unknown {
		if (Array.isArray(value))
			return value.map((item) => this.rename(item, ids));
		if (!value || typeof value !== "object") return value;
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [
				key,
				key === "objectId" && typeof item === "string"
					? (ids[item] ?? item)
					: this.rename(item, ids),
			]),
		);
	}
	private remove(value: unknown, id: string): void {
		if (!value || typeof value !== "object") return;
		for (const item of Object.values(value)) {
			if (Array.isArray(item)) {
				const index = item.findIndex((child) => child?.objectId === id);
				if (index >= 0) item.splice(index, 1);
			}
			this.remove(item, id);
		}
	}
	private find(value: unknown, id: string): object | undefined {
		if (!value || typeof value !== "object") return undefined;
		if ("objectId" in value && value.objectId === id) return value;
		for (const item of Object.values(value)) {
			const result = this.find(item, id);
			if (result) return result;
		}
		return undefined;
	}
	element(id: string | null | undefined): slides_v1.Schema$PageElement {
		const value = this.find(this.data, id ?? "");
		if (!value) throw new Error("Missing element");
		return value;
	}
}
