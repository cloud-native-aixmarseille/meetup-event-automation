import { describe, expect, it } from "vitest";
import { SlideTemplateBindings } from "./slide-template-bindings.js";

describe("SlideTemplateBindings", () => {
	it("accepts uniformly styled text when provider properties are reordered", () => {
		// Arrange
		const first = {
			fontFamily: "Example",
			fontSize: { magnitude: 12, unit: "PT" },
		};
		const second = {
			fontSize: { unit: "PT", magnitude: 12 },
			fontFamily: "Example",
		};
		const element = {
			shape: {
				text: {
					textElements: [
						{ textRun: { content: "First", style: first } },
						{ textRun: { content: "Second", style: second } },
					],
				},
			},
		};

		// Act
		const style = SlideTemplateBindings.style(element);

		// Assert
		expect(style).toEqual(first);
	});

	it("rejects differing styles that a text replacement would erase", () => {
		// Arrange
		const element = {
			shape: {
				text: {
					textElements: [
						{ textRun: { content: "First", style: { bold: true } } },
						{ textRun: { content: "Second", style: { bold: false } } },
					],
				},
			},
		};

		// Act
		const read = () => SlideTemplateBindings.style(element);

		// Assert
		expect(read).toThrow();
	});
});
