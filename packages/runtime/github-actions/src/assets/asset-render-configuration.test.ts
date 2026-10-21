import { PublicationDomainComposition } from "@meetup-automation/publication";
import { describe, expect, it } from "vitest";
import { GithubActionsComposition } from "../dependency-composition.js";
import { AssetRenderConfiguration } from "./asset-render-configuration.js";

describe("public render configuration", () => {
	it("accepts public host logos independently of venue addresses", () => {
		// Arrange
		const logos = {
			"host-example": {
				url: "https://images.example.org/logo.png",
				description: "Public host logo",
			},
		};

		// Act
		const actual = new AssetRenderConfiguration({
			contentContractPolicy:
				new PublicationDomainComposition().contentContractPolicy(),
			runtimeInput: new GithubActionsComposition().runtimeInput(),
		}).parse({}, {}, logos);

		// Assert
		expect(actual.hostLogos).toEqual(logos);
	});

	it.each([
		{
			"display name": {
				url: "https://images.example.org/logo.png",
				description: "Logo",
			},
		},
		{ "host-example": { url: "https://images.example.org/logo.png" } },
		{ "host-example": { url: "", description: "Logo" } },
		{
			"host-example": {
				url: "https://images.example.org/logo.png",
				description: "Logo",
				email: "private@example.test",
			},
		},
	])(
		"rejects invalid host-logo identities or extra contact fields",
		(logos) => {
			// Arrange
			const input = logos;

			// Act
			const parse = () =>
				new AssetRenderConfiguration({
					contentContractPolicy:
						new PublicationDomainComposition().contentContractPolicy(),
					runtimeInput: new GithubActionsComposition().runtimeInput(),
				}).parse({}, {}, input);

			// Assert
			expect(parse).toThrow();
		},
	);

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
		const actual = new AssetRenderConfiguration({
			contentContractPolicy:
				new PublicationDomainComposition().contentContractPolicy(),
			runtimeInput: new GithubActionsComposition().runtimeInput(),
		}).parse(event, venues);

		// Assert
		expect(actual).toEqual({ ...event, venues, hostLogos: {} });
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
		const parse = () =>
			new AssetRenderConfiguration({
				contentContractPolicy:
					new PublicationDomainComposition().contentContractPolicy(),
				runtimeInput: new GithubActionsComposition().runtimeInput(),
			}).parse(event, venues);

		// Act
		const operation = parse;

		// Assert
		expect(operation).toThrow();
	});
});
