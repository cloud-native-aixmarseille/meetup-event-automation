import { describe, expect, it } from "vitest";
import { SlidesPdfInput } from "./slides-pdf-input.js";

const source = {
	revision: "a".repeat(64),
	protectedFolderIds: ["private", "templates"],
	container: {
		id: "event-folder",
		name: "Event",
		url: "https://example.test/event",
		eventId: "example/meetups#12",
	},
	presentation: { id: "slides", name: "Slides", templateId: "template" },
};
describe("PDF source boundary", () => {
	it("retains only public identities and the opaque revision", () => {
		// Arrange
		const input = new SlidesPdfInput();
		const payload = {
			...source,
			contact: "private@example.test",
			container: { ...source.container, credentials: "secret" },
		};
		// Act
		const parsed = input.parse(JSON.stringify(payload));
		// Assert
		expect(parsed).toEqual(source);
		expect(JSON.stringify(parsed)).not.toMatch(/private@example|secret/);
	});
	it("accepts an explicitly empty source when documents are unavailable", () => {
		// Arrange
		const input = new SlidesPdfInput();
		// Act
		const result = input.parse("{}");
		// Assert
		expect(result).toEqual({});
	});
	it.each([
		null,
		[],
		"invalid",
		{ revision: "bad" },
		{ ...source, protectedFolderIds: [] },
		{ ...source, protectedFolderIds: [" "] },
		{ ...source, container: null },
		{ ...source, container: { ...source.container, eventId: 12 } },
		{ ...source, presentation: { ...source.presentation, templateId: "" } },
	])("rejects malformed sources before composition: %j", (payload) => {
		// Arrange
		const input = new SlidesPdfInput();
		// Act
		const parse = () => input.parse(JSON.stringify(payload));
		// Assert
		expect(parse).toThrow();
	});
});
