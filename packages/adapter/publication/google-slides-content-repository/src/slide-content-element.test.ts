import { describe, expect, it } from "vitest";
import { SlideContentElement } from "./slide-content-element.js";

describe("managed slide element lookup", () => {
	it("identifies the slide when a managed text box was deleted", () => {
		// Arrange
		const presentation = {
			slides: [
				{ objectId: "news_slide", pageElements: [{ objectId: "manual_text" }] },
			],
		};
		const binding = {
			anchor: { pageId: "news_slide", objectId: "next_event_date" },
		};
		// Act
		const lookup = () => new SlideContentElement().find(presentation, binding);
		// Assert
		expect(lookup).toThrow(
			expect.objectContaining({
				code: "conflict",
				reason: "missing",
				pageId: "news_slide",
			}),
		);
	});
});
