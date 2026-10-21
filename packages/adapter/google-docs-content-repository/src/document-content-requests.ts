import type { docs_v1 } from "@googleapis/docs";
import {
	type ContentChange,
	ContentError,
} from "@meetup-automation/publication";
import type { DocumentTab } from "./document-tabs.js";

export class DocumentContentRequests {
	static build(
		tabs: readonly DocumentTab[],
		changes: readonly ContentChange[],
	): docs_v1.Schema$Request[] {
		return [...changes]
			.sort(
				(a, b) =>
					(b.location.anchor.start ?? 0) - (a.location.anchor.start ?? 0),
			)
			.flatMap((change) => DocumentContentRequests.change(tabs, change));
	}

	private static change(
		tabs: readonly DocumentTab[],
		change: ContentChange,
	): docs_v1.Schema$Request[] {
		const { anchor } = change.location;
		if (!anchor.tabId) throw new ContentError("conflict");
		if (change.value.type === "image")
			return [
				{
					replaceImage: {
						imageObjectId: anchor.objectId,
						uri: change.value.image?.url,
						tabId: anchor.tabId,
						imageReplaceMethod: "CENTER_CROP",
					},
				},
			];
		const tab = tabs.find((tab) => tab.id === anchor.tabId);
		const named =
			tab?.content.namedRanges?.[anchor.rangeName ?? ""]?.namedRanges?.[0];
		const style = tab?.content.body?.content
			?.flatMap((item) => item.paragraph?.elements ?? [])
			.find(
				(item) =>
					(item.startIndex ?? 0) <= (anchor.start ?? 0) &&
					(item.endIndex ?? 0) > (anchor.start ?? 0),
			)?.textRun?.textStyle;
		const range = {
			tabId: anchor.tabId,
			segmentId: "",
			startIndex: anchor.start,
			endIndex: (anchor.start ?? 0) + (change.value.text?.length ?? 0),
		};
		return [
			...(named?.namedRangeId
				? [
						{
							deleteNamedRange: {
								namedRangeId: named.namedRangeId,
								tabsCriteria: { tabIds: [anchor.tabId] },
							},
						},
					]
				: []),
			{ deleteContentRange: { range: { ...range, endIndex: anchor.end } } },
			{
				insertText: {
					location: { tabId: anchor.tabId, segmentId: "", index: anchor.start },
					text: change.value.text,
				},
			},
			{ createNamedRange: { name: anchor.rangeName, range } },
			...(style && Object.keys(style).length
				? [
						{
							updateTextStyle: {
								range,
								textStyle: style,
								fields: Object.keys(style).join(","),
							},
						},
					]
				: []),
		];
	}
}
