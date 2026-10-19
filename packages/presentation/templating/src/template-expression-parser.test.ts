import { describe, expect, it } from "vitest";
import { TemplateExpressionParser } from "./template-expression-parser.js";

describe("template expression grammar", () => {
	it.each([
		[
			"braces",
			"speaker.name:portrait:one",
			{ entity: "speaker", property: "name", argument: "portrait:one" },
		],
		[
			"brackets",
			"EVENT_DATE:YYYY-MM-DD",
			{ entity: "event", property: "date", argument: "YYYY-MM-DD" },
		],
		[
			"brackets",
			"HOST_POSTAL_CODE",
			{ entity: "host", property: "postal_code" },
		],
		[
			"braces",
			"next_event.host.name",
			{ entity: "next_event", property: "host.name" },
		],
		[
			"braces",
			"talk.title:opening",
			{ entity: "talk", property: "title", argument: "opening" },
		],
		[
			"braces",
			"event.date:D MMMM YYYY",
			{ entity: "event", property: "date", argument: "D MMMM YYYY" },
		],
		["braces", "agenda", { entity: "", property: "agenda" }],
	] as const)("parses %s reference %s", (syntax, text, expected) => {
		// Arrange
		const parser = new TemplateExpressionParser();
		// Act
		const expression = parser.parse(text, syntax);
		// Assert
		expect(expression).toEqual(expected);
	});
	it.each([
		"event.date:",
		"event.date: ",
		"event.date|YYYY",
		"event..date",
		"event.date()",
		" event.date",
		"event.date}",
	])("rejects malformed reference %s", (text) => {
		// Arrange
		const parser = new TemplateExpressionParser();
		// Act
		const parse = () => parser.parse(text, "braces");
		// Assert
		expect(parse).toThrow("Invalid template syntax");
	});
});
