import type { ContentBinding } from "@meetup-automation/publication";
import { describe, expect, it, vi } from "vitest";
import { DocumentContentLocations } from "./document-content-locations.js";

describe("DocumentContentLocations", () => {
	it.each([
		[
			{ brightness: 0.25, contrast: 0.5 },
			"e52043b778c08a8ddf9b8689deb9cf8b254c096fecd96b3a67abf6a5d5130ff2",
		],
		[
			{ contrast: 0.5, brightness: 0.25 },
			"2fb5ea7800c4ab4815e7e4490a865502b68b9ee7a1d2b0d234090daa8f91d993",
		],
		[{}, "dd205941e74bae18024560b5539ce3aaee7462cab7f2e2f9891e11e18fd52837"],
	] as const)(
		"preserves stored observation bytes for provider property variant %#",
		async (properties, expected) => {
			// Arrange
			const reader = new DocumentContentLocations({
				validate: vi.fn(),
				observe: vi.fn(async () => "embedded-bytes"),
			});
			const tabs = [
				{
					id: "tab",
					content: {
						body: {
							content: [
								{
									paragraph: {
										elements: [
											{ inlineObjectElement: { inlineObjectId: "portrait" } },
										],
									},
								},
							],
						},
						inlineObjects: {
							portrait: {
								inlineObjectProperties: {
									embeddedObject: {
										description: "Example",
										imageProperties: {
											contentUri: "https://example.test/image",
											sourceUri: "https://example.test/source",
											...properties,
										},
									},
								},
							},
						},
					},
				},
			];
			const binding: ContentBinding = {
				id: "portrait",
				key: "speaker",
				type: "image",
				anchor: { tabId: "tab", objectId: "portrait" },
				applied: "",
			};

			// Act
			const location = await reader.read(tabs, binding, false);

			// Assert
			expect(location.fingerprint).toBe(expected);
		},
	);
});
