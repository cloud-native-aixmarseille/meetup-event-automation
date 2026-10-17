import { describe, expect, it } from "vitest";
import { AssetContentConfiguration } from "./asset-content-configuration.js";

describe("committed content configuration", () => {
	it("selects explicit speaker identities and recovery only for the current event", () => {
		// Arrange
		const input = {
			version: 1,
			contracts: {},
			events: {
				"example/meetups#42": { speakers: { portrait: "speaker-one" } },
				"example/meetups#43": { speakers: { portrait: "speaker-two" } },
			},
		};
		// Act
		const result = AssetContentConfiguration.parse(input, "example/meetups#42");
		// Assert
		expect(result.speakers).toEqual({ portrait: "speaker-one" });
		expect(result.recovery).toEqual({});
	});

	it("rejects recovery without a read revision", () => {
		// Arrange
		let error: unknown;
		// Act
		try {
			AssetContentConfiguration.parse(
				{
					version: 1,
					contracts: {},
					events: {
						event: {
							recovery: { file: { operation: "remove", bindingId: "shape" } },
						},
					},
				},
				"event",
			);
		} catch (caught) {
			error = caught;
		}
		// Assert
		expect(error).toBeInstanceOf(Error);
	});
});
