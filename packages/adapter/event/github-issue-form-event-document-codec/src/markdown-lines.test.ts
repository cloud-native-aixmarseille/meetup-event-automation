import { describe, expect, it } from "vitest";
import { MarkdownLines } from "./markdown-lines.js";

describe("completion marker parsing", () => {
	it.each([
		"✅ Send host thank-you email",
		"  ✅ Send host thank-you email  ",
		"\t✅\tSend host thank-you email\r",
	])("reads a completed task from %j", (line) => {
		// Arrange
		const parser = new MarkdownLines();

		// Act
		const result = parser.parseCompletionLine(line);

		// Assert
		expect(result).toEqual({ label: "Send host thank-you email" });
	});

	it.each([
		"",
		"✅",
		"✅ \t",
		"✅Task",
		"- [x] Task",
		"- [ ] Task",
		"Text ✅ Task",
	])("rejects a line without a complete marker and label: %j", (line) => {
		// Arrange
		const parser = new MarkdownLines();

		// Act
		const result = parser.parseCompletionLine(line);

		// Assert
		expect(result).toBeUndefined();
	});
});
