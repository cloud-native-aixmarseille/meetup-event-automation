import { PublicationDomainComposition } from "@meetup-automation/publication";
import { describe, expect, it } from "vitest";
import { GithubActionsComposition } from "../dependency-composition.js";
import { AssetContentConfiguration } from "./asset-content-configuration.js";

describe("committed content configuration", () => {
	it("loads public venues and only the current event's talk assignments", () => {
		// Arrange
		const opening = {
			provider: "conference-hall",
			event: "public-cfp",
			id: "proposal-a",
		};
		const venue = {
			address: "Public square",
			postalCode: "13001",
			city: "Marseille",
		};
		const input = {
			version: 1,
			contracts: {},
			hostLogos: {
				"host-0001": {
					url: "https://images.example.org/logo.png",
					description: "Host logo",
				},
			},
			venues: { "host-0001": venue },
			events: {
				"example/meetups#42": { talks: { opening } },
				"example/meetups#43": {
					talks: { different: { ...opening, id: "proposal-b" } },
				},
			},
		};

		// Act
		const actual = new AssetContentConfiguration({
			runtimeInput: new GithubActionsComposition().runtimeInput(),
			contentContractPolicy:
				new PublicationDomainComposition().contentContractPolicy(),
			assetRenderConfiguration:
				new GithubActionsComposition().assetRenderConfiguration(),
		}).parse(input, "example/meetups#42");
		const absent = new AssetContentConfiguration({
			runtimeInput: new GithubActionsComposition().runtimeInput(),
			contentContractPolicy:
				new PublicationDomainComposition().contentContractPolicy(),
			assetRenderConfiguration:
				new GithubActionsComposition().assetRenderConfiguration(),
		}).parse(input, "example/meetups#44");

		// Assert
		expect(actual.talks).toEqual({ opening });
		expect(actual.venues).toEqual({ "host-0001": venue });
		expect(actual.hostLogos).toEqual(input.hostLogos);
		expect(absent.hostLogos).toEqual(input.hostLogos);
		expect(absent.talks).toEqual({});
	});

	it.each([
		[
			{ slides: { fields: [{ type: "text", token: "next_event.host.name" }] } },
			true,
		],
		[{ slides: { fields: [{ type: "text", token: "event.title" }] } }, false],
		[{ broken: null, malformed: { fields: "invalid" } }, false],
	] as const)(
		"enables next-meetup selection only for a declared field",
		(contracts, expected) => {
			// Arrange
			const input = contracts;

			// Act
			const actual = new AssetContentConfiguration({
				runtimeInput: new GithubActionsComposition().runtimeInput(),
				contentContractPolicy:
					new PublicationDomainComposition().contentContractPolicy(),
				assetRenderConfiguration:
					new GithubActionsComposition().assetRenderConfiguration(),
			}).usesNextEvent(input);

			// Assert
			expect(actual).toBe(expected);
		},
	);

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
		const result = new AssetContentConfiguration({
			runtimeInput: new GithubActionsComposition().runtimeInput(),
			contentContractPolicy:
				new PublicationDomainComposition().contentContractPolicy(),
			assetRenderConfiguration:
				new GithubActionsComposition().assetRenderConfiguration(),
		}).parse(input, "example/meetups#42");

		// Assert
		expect(result.speakers).toEqual({ portrait: "speaker-one" });
		expect(result.recovery).toEqual({});
	});

	it("rejects recovery without a read revision", () => {
		// Arrange
		let error: unknown;

		// Act
		try {
			new AssetContentConfiguration({
				runtimeInput: new GithubActionsComposition().runtimeInput(),
				contentContractPolicy:
					new PublicationDomainComposition().contentContractPolicy(),
				assetRenderConfiguration:
					new GithubActionsComposition().assetRenderConfiguration(),
			}).parse(
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

describe("asset configuration boundary", () => {
	it.each([
		null,
		[],
		false,
		{ version: 1, contracts: {}, venues: null },
		{ version: 1, contracts: {}, events: { event: null } },
		{ version: 1, contracts: {}, events: { event: { recovery: null } } },
		{ version: 1, contracts: [] },
		{ version: 1, contracts: {}, events: [] },
		{ version: 1, contracts: {}, events: { event: false } },
		{
			version: 1,
			contracts: {},
			events: { event: { recovery: { file: true } } },
		},
		{
			version: 1,
			contracts: {},
			events: {
				event: {
					recovery: {
						file: { operation: "enroll", revision: "2", bindingId: false },
					},
				},
			},
		},
		{ version: 1, contracts: {}, venues: { "host-one": false } },
		{
			version: 1,
			contracts: {},
			events: { event: { talks: { opening: [] } } },
		},
	])("rejects malformed external data", (input) => {
		// Arrange
		const eventId = "event";

		// Act
		const parse = () =>
			new AssetContentConfiguration({
				runtimeInput: new GithubActionsComposition().runtimeInput(),
				contentContractPolicy:
					new PublicationDomainComposition().contentContractPolicy(),
				assetRenderConfiguration:
					new GithubActionsComposition().assetRenderConfiguration(),
			}).parse(input, eventId);

		// Assert
		expect(parse).toThrow(/Invalid/);
	});
});
