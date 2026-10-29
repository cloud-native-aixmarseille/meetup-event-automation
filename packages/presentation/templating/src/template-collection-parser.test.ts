import { describe, expect, it } from "vitest";
import { TemplateCollectionParser } from "./template-collection-parser.js";

describe("native collection directives", () => {
	it.each(["talks", "speakers", "entries"])(
		"parses the generic %s collection",
		(name) => {
			// Arrange
			const subject = new TemplateCollectionParser();
			// Act
			const result = subject.parse(`{{#each ${name}}}`);
			// Assert
			expect(result).toBe(name);
		},
	);
	it.each([
		"{{#each}}",
		"{{#each talks:2}}",
		"prefix {{#each talks}}",
		"{{#unless talks}}",
	])("rejects malformed directive %s", (marker) => {
		// Arrange
		const subject = new TemplateCollectionParser();
		// Act
		const action = () => subject.parse(marker);
		// Assert
		expect(action).toThrow();
	});
});
