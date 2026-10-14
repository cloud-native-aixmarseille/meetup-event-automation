import { describe, expect, it } from "vitest";
import { PresentationFileUrl } from "./presentation-file-url.js";

describe("presentation file URLs", () => {
	it.each([
		"https://docs.google.com/presentation/d/event-slides",
		"https://docs.google.com/presentation/d/event-slides/edit#slide=id.start",
		"https://drive.google.com/file/d/event-slides/view?resourcekey=example",
	])("accepts and trims a direct file link: %s", (url) => {
		// Arrange
		const input = `  ${url}  `;

		// Act
		const result = PresentationFileUrl.normalize(input);

		// Assert
		expect(result).toBe(url);
	});

	it.each([
		undefined,
		"",
		"not a URL",
		"https://drive.google.com/drive/folders/event-assets",
		"https://docs.google.com/presentation/d/",
		"https://docs.google.com/spreadsheets/d/attendance/edit",
		"http://docs.google.com/presentation/d/event-slides/edit",
		"https://docs.google.com.example.test/presentation/d/event-slides/edit",
		"https://user:password@docs.google.com/presentation/d/event-slides/edit",
		"https://docs.google.com:444/presentation/d/event-slides/edit",
	])("rejects a missing or invalid presentation link: %s", (input) => {
		// Arrange
		// Use the parameterized candidate.

		// Act
		const result = PresentationFileUrl.normalize(input);

		// Assert
		expect(result).toBeUndefined();
	});
});
