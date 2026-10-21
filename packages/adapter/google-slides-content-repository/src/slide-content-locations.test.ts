import type { ContentBinding } from "@meetup-automation/publication";
import { describe, expect, it, vi } from "vitest";
import { SlideContentLocations } from "./slide-content-locations.js";

describe("SlideContentLocations", () => {
	it.each([
		[
			{ brightness: 0.25, contrast: 0.5 },
			"f65b2667d18b4834badfb624109892b9b7433a3c8bf55168f3c77b1ba02a29b5",
		],
		[
			{ contrast: 0.5, brightness: 0.25 },
			"9153b1980a2c279c866d76ed363e15b1b1e4ca90093259c4812b5d2368c2e36e",
		],
		[
			undefined,
			"fe566a52703a2e5fd04b064cc1dae5d0a742b601f13a91017084784107c0541c",
		],
	] as const)(
		"preserves stored observation bytes for provider property variant %#",
		async (properties, expected) => {
			// Arrange
			const reader = new SlideContentLocations({
				validate: vi.fn(),
				observe: vi.fn(async () => "embedded-bytes"),
			});
			const presentation = {
				slides: [
					{
						objectId: "page",
						pageElements: [
							{
								objectId: "portrait",
								description: "Example",
								image: {
									contentUrl: "https://example.test/image",
									imageProperties: properties,
								},
							},
						],
					},
				],
			};
			const binding: ContentBinding = {
				id: "portrait",
				key: "speaker",
				type: "image",
				anchor: { pageId: "page", objectId: "portrait" },
				applied: "",
			};

			// Act
			const [location] = await reader.read(presentation, [binding]);

			// Assert
			expect(location.fingerprint).toBe(expected);
		},
	);
});
