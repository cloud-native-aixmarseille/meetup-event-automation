import type { ContentAnchor } from "./asset-content.js";

/** Anchor identity does not depend on provider JSON property order. */
export class ContentAnchorIdentity {
	static equal(left: ContentAnchor, right: ContentAnchor): boolean {
		return (
			left.objectId === right.objectId &&
			left.pageId === right.pageId &&
			left.tabId === right.tabId &&
			left.segmentId === right.segmentId &&
			left.rangeName === right.rangeName &&
			left.start === right.start &&
			left.end === right.end
		);
	}

	static locationKey(anchor: ContentAnchor): string {
		// Fixed tuple order is intentional; absent identifiers serialize as null.
		return JSON.stringify([
			anchor.pageId,
			anchor.tabId,
			anchor.segmentId,
			anchor.objectId,
			anchor.rangeName,
		]);
	}
}
