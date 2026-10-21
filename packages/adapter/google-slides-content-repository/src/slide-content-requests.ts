import type { slides_v1 } from "@googleapis/slides";
import type { ContentChange } from "@meetup-automation/publication";
import { SlideContentElement } from "./slide-content-element.js";
import { SlideTemplateBindings } from "./slide-template-bindings.js";

export class SlideContentRequests {
	static build(
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
		const element = SlideContentElement.find(current, change.location);
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
}
