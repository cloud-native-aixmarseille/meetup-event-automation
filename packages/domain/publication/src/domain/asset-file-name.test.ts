import { describe, expect, it, vi } from "vitest";
import { AssetFileName } from "./asset-file-name.js";
import type { AssetTemplateRenderer } from "./asset-template-renderer.js";

describe("asset filename field resolution", () => {
	it("resolves the public calendar date and delegates syntax and formatting", () => {
		// Arrange
		let resolved: unknown;
		const render = vi.fn<AssetTemplateRenderer["render"]>(
			(_template, resolve) => {
				resolved = resolve({
					entity: "event",
					property: "date",
					argument: "D MMMM YYYY",
				});
				return "12 avril 2027 - Community";
			},
		);
		const names = new AssetFileName({ render });
		// Act
		const result = names.render(
			"[EVENT_DATE:D MMMM YYYY] - Community",
			"2027-04-12",
		);
		// Assert
		expect(result).toBe("12 avril 2027 - Community");
		expect(render).toHaveBeenCalledWith(
			"[EVENT_DATE:D MMMM YYYY] - Community",
			expect.any(Function),
		);
		expect(resolved).toEqual({
			kind: "date",
			value: "2027-04-12",
			format: "D MMMM YYYY",
		});
	});
	it.each([
		{ entity: "host", property: "date", argument: "YYYY" },
		{ entity: "event", property: "title", argument: "YYYY" },
		{ entity: "event", property: "date" },
	])("rejects unsupported filename field $entity.$property", (expression) => {
		// Arrange
		const names = new AssetFileName({
			render: (_template, resolve) => {
				resolve(expression);
				return "";
			},
		});
		// Act
		const render = () => names.render("template", "2027-04-12");
		// Assert
		expect(render).toThrow();
	});
});
