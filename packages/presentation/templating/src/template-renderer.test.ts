import { describe, expect, it, vi } from "vitest";
import { TemplatingComposition } from "./dependency-composition.js";
import { TemplateRenderer } from "./template-renderer.js";

describe("shared template rendering", () => {
	it.each(["fr", "en"])(
		"renders mixed syntax with an explicit %s locale",
		(locale) => {
			// Arrange
			const composition = new TemplatingComposition();
			const renderer = new TemplateRenderer(
				composition.parser(),
				composition.dates(locale),
			);
			// Act
			const result = renderer.render(
				"{{event.title}} - [EVENT_DATE:D MMMM YYYY]",
				(expression) =>
					expression.property === "title"
						? { kind: "text", value: "Cloud Native" }
						: {
								kind: "date",
								value: "2027-04-05",
								format: expression.argument ?? "long",
							},
			);
			// Assert
			expect(result).toBe(
				locale === "fr"
					? "Cloud Native - 5 avril 2027"
					: "Cloud Native - 5 April 2027",
			);
		},
	);
	it("inserts values once without recursive interpolation or escaping", () => {
		// Arrange
		const composition = new TemplatingComposition();
		const renderer = new TemplateRenderer(
			composition.parser(),
			composition.dates("en"),
		);
		const resolve = vi.fn().mockReturnValue({
			kind: "text",
			value: "{{host.name}} [EVENT_DATE:YYYY] <hello>",
		});
		// Act
		const result = renderer.render("{{event.title}}", resolve);
		// Assert
		expect(result).toBe("{{host.name}} [EVENT_DATE:YYYY] <hello>");
		expect(resolve).toHaveBeenCalledTimes(1);
	});
	it("preserves resolver failures without rendering a partial result", () => {
		// Arrange
		const renderer = new TemplatingComposition().renderer("en");
		const failure = new Error("Unregistered public field");
		// Act
		const render = () =>
			renderer.render("{{private.email}}", () => {
				throw failure;
			});
		// Assert
		expect(render).toThrow(failure);
	});
});
