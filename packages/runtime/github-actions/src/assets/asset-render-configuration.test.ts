import { describe, expect, it } from "vitest";
import { AssetRenderConfiguration } from "./asset-render-configuration.js";

describe("public render configuration", () => {
	it("accepts explicit public venues and stable talk/speaker identities", () => {
		// Arrange
		const event = {
			speakers: { portrait: "speaker-example" },
			talks: {
				opening: {
					provider: "conference-hall",
					event: "public-cfp",
					id: "proposal-a",
				},
			},
		};
		const venues = {
			"host-example": {
				address: "1 Public Street",
				postalCode: "13001",
				city: "Marseille",
			},
		};

		// Act
		const actual = AssetRenderConfiguration.parse(event, venues);

		// Assert
		expect(actual).toEqual({ ...event, venues });
	});

	it.each([
		[{ talks: { opening: { id: "proposal-a" } } }, {}],
		[
			{
				talks: {
					opening: { provider: "conference-hall", event: "cfp", id: "bad id" },
				},
			},
			{},
		],
		[{ speakers: { portrait: "Display Name" } }, {}],
		[{ speakers: { constructor: "speaker-example" } }, {}],
		[{ talks: [] }, {}],
		[
			{},
			{
				"host-example": { address: "", postalCode: "13001", city: "Marseille" },
			},
		],
		[
			{},
			{
				"host-example": {
					address: "public",
					postalCode: "13001",
					city: "Marseille",
					email: "private@example.test",
				},
			},
		],
		[
			{},
			{
				"Display Name": {
					address: "public",
					postalCode: "13001",
					city: "Marseille",
				},
			},
		],
		[{}, []],
	])("rejects invalid or unreviewed fields", (event, venues) => {
		// Arrange
		const parse = () => AssetRenderConfiguration.parse(event, venues);

		// Act
		const operation = parse;

		// Assert
		expect(operation).toThrow();
	});
});
