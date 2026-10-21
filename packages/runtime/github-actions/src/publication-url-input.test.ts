import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PublicationUrlInput } from "./publication-url-input.js";
import { RuntimeInput } from "./runtime-input.js";

const configuration = {
	meetupEventUrlPrefix: "https://www.meetup.com/example-group/events/",
	communityEventUrlPrefixes: [
		"https://ocgroups.dev/cncf/group/example/event/",
		"https://community.cncf.io/events/details/cncf-example-presents-",
	],
	assetFolderUrlPrefix: "https://drive.google.com/drive/folders/",
};

beforeEach(() => {
	vi.stubEnv(
		"INPUT_MEETUP-EVENT-URL-PREFIX",
		configuration.meetupEventUrlPrefix,
	);
	vi.stubEnv(
		"INPUT_COMMUNITY-EVENT-URL-PREFIXES",
		JSON.stringify(configuration.communityEventUrlPrefixes),
	);
	vi.stubEnv(
		"INPUT_ASSET-FOLDER-URL-PREFIX",
		configuration.assetFolderUrlPrefix,
	);
});
afterEach(() => vi.unstubAllEnvs());

describe("PublicationUrlInput", () => {
	it("reads all explicit prefixes and preserves both supported community path forms", () => {
		// Arrange
		const expected = configuration;

		// Act
		const result = new PublicationUrlInput(new RuntimeInput()).read();

		// Assert
		expect(result).toEqual(expected);
	});

	it("accepts explicitly configured community and asset HTTPS origins without provider defaults", () => {
		// Arrange
		const community = [
			"https://events.example.test:8443/community/event-",
			"https://meetings.example.test/",
		];
		const assets = "https://assets.example.test/community/folders/";
		vi.stubEnv("INPUT_COMMUNITY-EVENT-URL-PREFIXES", JSON.stringify(community));
		vi.stubEnv("INPUT_ASSET-FOLDER-URL-PREFIX", assets);

		// Act
		const result = new PublicationUrlInput(new RuntimeInput()).read();

		// Assert
		expect(result).toEqual({
			...configuration,
			communityEventUrlPrefixes: community,
			assetFolderUrlPrefix: assets,
		});
	});

	it.each([
		"meetup-event-url-prefix",
		"community-event-url-prefixes",
		"asset-folder-url-prefix",
	])("requires %s without substituting a default", (name) => {
		// Arrange
		vi.stubEnv(`INPUT_${name.toUpperCase()}`, undefined);

		// Act
		const read = () => new PublicationUrlInput(new RuntimeInput()).read();

		// Assert
		expect(read).toThrow(`Input required and not supplied: ${name}`);
	});

	it("rejects whitespace rather than silently trimming a supplied prefix", () => {
		// Arrange
		vi.stubEnv(
			"INPUT_ASSET-FOLDER-URL-PREFIX",
			` ${configuration.assetFolderUrlPrefix} `,
		);

		// Act
		const read = () => new PublicationUrlInput(new RuntimeInput()).read();

		// Assert
		expect(read).toThrow("Invalid input: asset-folder-url-prefix");
	});

	it.each([
		"{PRIVATE-secret",
		"null",
		"{}",
		"true",
		'"https://events.example.test/"',
		"[]",
		'[""]',
		"[5]",
		'["https://events.example.test/", null]',
	])(
		"rejects malformed or non-string community prefix arrays: %s",
		(source) => {
			// Arrange
			vi.stubEnv("INPUT_COMMUNITY-EVENT-URL-PREFIXES", source);

			// Act
			const read = () => new PublicationUrlInput(new RuntimeInput()).read();

			// Assert
			expect(read).toThrow("Invalid input: community-event-url-prefixes");
		},
	);

	it.each([
		"http://events.example.test/",
		"//events.example.test/",
		"https://events.example.test",
		"https:///events.example.test/",
		"https://private:secret@events.example.test/",
		"https://@events.example.test/",
		"https://events.example.test/?token=PRIVATE",
		"https://events.example.test/?",
		"https://events.example.test/#PRIVATE",
		"https://events.example.test/#",
		"https://events.example.test/\\events/",
		"https://events.example.test/event name/",
		"https://events.example.test/events/\n",
		"https://events.example.test/\u0000",
		"https://[invalid]/",
		"/events/",
		"",
	])(
		"rejects unsafe or malformed programmatic HTTPS prefixes: %s",
		(prefix) => {
			// Arrange
			const community = {
				...configuration,
				communityEventUrlPrefixes: [prefix],
			};
			const assets = { ...configuration, assetFolderUrlPrefix: prefix };

			// Act
			const validateCommunity = () =>
				new PublicationUrlInput(new RuntimeInput()).validate(community);
			const validateAssets = () =>
				new PublicationUrlInput(new RuntimeInput()).validate(assets);

			// Assert
			expect(validateCommunity).toThrow(
				"Invalid input: community-event-url-prefixes",
			);
			expect(validateAssets).toThrow("Invalid input: asset-folder-url-prefix");
		},
	);

	it.each([
		"https://www.meetup.com/example-group/",
		"https://www.meetup.com/example-group/events",
		"https://www.meetup.com/example-group/events/123/",
		"https://different.example.test/example-group/events/",
	])("requires the Meetup group event prefix: %s", (meetupEventUrlPrefix) => {
		// Arrange
		const input = { ...configuration, meetupEventUrlPrefix };

		// Act
		const validate = () =>
			new PublicationUrlInput(new RuntimeInput()).validate(input);

		// Assert
		expect(validate).toThrow("Invalid input: meetup-event-url-prefix");
	});

	it.each([null, [], undefined, true])(
		"rejects invalid programmatic configuration before composition: %s",
		(input) => {
			// Arrange
			const configuration = input;

			// Act
			const validate = () =>
				new PublicationUrlInput(new RuntimeInput()).validate(configuration);

			// Assert
			expect(validate).toThrow("Invalid publication URL configuration");
		},
	);

	it.each([
		[{}, "meetup-event-url-prefix"],
		[{ ...configuration, meetupEventUrlPrefix: 42 }, "meetup-event-url-prefix"],
		[
			{ ...configuration, communityEventUrlPrefixes: undefined },
			"community-event-url-prefixes",
		],
		[
			{ ...configuration, assetFolderUrlPrefix: undefined },
			"asset-folder-url-prefix",
		],
	] as const)("rejects incomplete programmatic settings: %j", (input, name) => {
		// Arrange
		const settings = input;

		// Act
		const validate = () =>
			new PublicationUrlInput(new RuntimeInput()).validate(settings);

		// Assert
		expect(validate).toThrow(`Invalid input: ${name}`);
	});

	it("returns only the validated configuration fields", () => {
		// Arrange
		const input = { ...configuration, secret: "PRIVATE-secret" };

		// Act
		const result = new PublicationUrlInput(new RuntimeInput()).validate(input);

		// Assert
		expect(result).toEqual(configuration);
		expect(result).not.toHaveProperty("secret");
		expect(result.communityEventUrlPrefixes).not.toBe(
			configuration.communityEventUrlPrefixes,
		);
	});

	it.each([
		"PRIVATE-secret",
		'["https://private:PRIVATE-secret@events.example.test/"]',
	])("does not expose supplied secrets or raw parser failures", (source) => {
		// Arrange
		vi.stubEnv("INPUT_COMMUNITY-EVENT-URL-PREFIXES", source);

		// Act
		let failure: unknown;
		try {
			new PublicationUrlInput(new RuntimeInput()).read();
		} catch (error) {
			failure = error;
		}

		// Assert
		expect(failure).toBeInstanceOf(Error);
		expect(failure).toMatchObject({
			message: "Invalid input: community-event-url-prefixes",
		});
		expect(String(failure)).not.toContain("PRIVATE-secret");
	});
});
