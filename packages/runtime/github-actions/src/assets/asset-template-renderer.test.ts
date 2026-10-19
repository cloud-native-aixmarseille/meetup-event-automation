import { ContentError } from "@meetup-automation/publication";
import { TemplateError } from "@meetup-automation/templating";
import { describe, expect, it } from "vitest";
import { AssetTemplateRendererImpl } from "./asset-template-renderer.js";

describe("publication template error boundary", () => {
	it.each([
		new TemplateError("format"),
		new Error("Synthetic formatter failure"),
	])("classifies %s without hiding technical failures", (error) => {
		// Arrange
		const renderer = new AssetTemplateRendererImpl({
			render: () => "",
			value: () => {
				throw error;
			},
		});
		// Act
		const render = () =>
			renderer.value({ kind: "date", value: "2027-04-05", format: "bad" });
		// Assert
		if (error instanceof TemplateError) expect(render).toThrow(ContentError);
		else expect(render).toThrow(error);
	});
});
