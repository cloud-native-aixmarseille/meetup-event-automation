import { describe, expect, it } from "vitest";
import { TemplateExpressionParser } from "./template-expression-parser.js";
import { TemplateParser } from "./template-parser.js";

describe("template occurrence scanning", () => {
	it("shares references across syntaxes and preserves UTF-16 offsets", () => {
		// Arrange
		const parser = new TemplateParser(new TemplateExpressionParser());
		const text =
			"🚀 {{event.title}} / [EVENT_DATE:DD/MM/YYYY] / {{talk.title:opening}}";
		// Act
		const occurrences = parser.parse(text);
		// Assert
		expect(occurrences.map(({ reference }) => reference)).toEqual([
			"event.title",
			"event.date:DD/MM/YYYY",
			"talk.title:opening",
		]);
		expect(occurrences[0].start).toBe(3);
		expect(occurrences.map(({ start, end }) => text.slice(start, end))).toEqual(
			["{{event.title}}", "[EVENT_DATE:DD/MM/YYYY]", "{{talk.title:opening}}"],
		);
	});
	it.each(["[Draft] Slides", "Text {without templates}", ""])(
		"preserves ordinary literal text %s",
		(text) => {
			// Arrange
			const parser = new TemplateParser(new TemplateExpressionParser());
			// Act
			const result = parser.parse(text);
			// Assert
			expect(result).toEqual([]);
		},
	);
	it.each([
		"{{event.title",
		"{{event.title}} }}",
		"{{event.{{host.name}}}}",
		"[EVENT_DATE:YYYY",
		"[EVENT_DATE:]",
		"[event_DATE:YYYY]",
		"[_DATE:YYYY]",
		"[EVENTDATE:YYYY]",
		"{{event.date:YYYY}} {{invalid:",
	])("rejects malformed template %s", (text) => {
		// Arrange
		const parser = new TemplateParser(new TemplateExpressionParser());
		// Act
		const parse = () => parser.parse(text);
		// Assert
		expect(parse).toThrow("Invalid template syntax");
	});
	it.each(["{{event.title}}", "[EVENT_DATE:YYYY]", "{{unfinished", "}}"])(
		"detects template syntax %s for unsupported provider locations",
		(text) => {
			// Arrange
			const parser = new TemplateParser(new TemplateExpressionParser());
			// Act
			const contains = parser.contains(text);
			// Assert
			expect(contains).toBe(true);
		},
	);
});
