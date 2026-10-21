import type { slides_v1 } from "@googleapis/slides";
import {
	type ContentBinding,
	ContentError,
} from "@meetup-automation/publication";

export class SlideContentElement {
	static find(
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
