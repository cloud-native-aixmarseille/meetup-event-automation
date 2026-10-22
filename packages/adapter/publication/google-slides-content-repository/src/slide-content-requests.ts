import type { slides_v1 } from "@googleapis/slides";
import type { ContentChange } from "@meetup-automation/publication";
import type { SlideContentElement } from "./slide-content-element.js";
import type { SlideTemplateBindings } from "./slide-template-bindings.js";

export interface SlideContentRequestsCollaborators {
	readonly slideContentElement: Pick<SlideContentElement, "find">;
	readonly slideTemplateBindings: Pick<SlideTemplateBindings, "style">;
}

export class SlideContentRequests {
	constructor(
		private readonly collaborators: SlideContentRequestsCollaborators,
	) {}

	build(
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
		const element = this.collaborators.slideContentElement.find(
			current,
			change.location,
		);
		const style = this.collaborators.slideTemplateBindings.style(element);
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
}
