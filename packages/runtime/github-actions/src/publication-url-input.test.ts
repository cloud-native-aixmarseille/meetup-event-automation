import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PublicationUrlInput } from "./publication-url-input.js";

const settings = [
	{
		name: "meetup-event-url-prefix",
		read: "readMeetupEventUrlPrefix",
		validate: "validateMeetupEventUrlPrefix",
		value: "https://www.meetup.com/example-group/events/",
	},
	{
		name: "community-event-url-prefixes",
		read: "readCommunityEventUrlPrefixes",
		validate: "validateCommunityEventUrlPrefixes",
		value: [
			"https://events.example.test:8443/community/event-",
			"https://meetings.example.test/",
		],
	},
	{
		name: "asset-folder-url-prefix",
		read: "readAssetFolderUrlPrefix",
		validate: "validateAssetFolderUrlPrefix",
		value: "https://assets.example.test/community/folders/",
	},
] as const;

beforeEach(() => {
	for (const { name } of settings)
		vi.stubEnv(`INPUT_${name.toUpperCase()}`, undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe("PublicationUrlInput", () => {
	it.each(settings)(
		"reads $name without requiring any other URL setting",
		({ name, read, value }) => {
			// Arrange
			vi.stubEnv(
				`INPUT_${name.toUpperCase()}`,
				typeof value === "string" ? value : JSON.stringify(value),
			);
			const parser = new PublicationUrlInput();

			// Act
			const result = parser[read]();

			// Assert
			expect(result).toEqual(value);
		},
	);

	it.each(settings)(
		"requires $name when that setting is requested",
		({ name, read }) => {
			// Arrange
			const parser = new PublicationUrlInput();

			// Act
			const readSetting = () => parser[read]();

			// Assert
			expect(readSetting).toThrow(`Input required and not supplied: ${name}`);
		},
	);

	it.each(settings)(
		"validates $name without other programmatic settings",
		({ validate, value }) => {
			// Arrange
			const parser = new PublicationUrlInput();

			// Act
			const result = parser[validate](value);

			// Assert
			expect(result).toEqual(value);
		},
	);

	it.each(
		settings.flatMap((setting) =>
			[undefined, null, {}, true, 42].map((value) => ({ ...setting, value })),
		),
	)("rejects invalid $name values: $value", ({ name, validate, value }) => {
		// Arrange
		const parser = new PublicationUrlInput();

		// Act
		const validateSetting = () => parser[validate](value);

		// Assert
		expect(validateSetting).toThrow(`Invalid input: ${name}`);
	});

	it("rejects whitespace instead of trimming a supplied prefix", () => {
		// Arrange
		vi.stubEnv(
			"INPUT_ASSET-FOLDER-URL-PREFIX",
			" https://assets.example.test/folders/ ",
		);

		// Act
		const read = () => new PublicationUrlInput().readAssetFolderUrlPrefix();

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
	])("rejects malformed community prefix arrays: %s", (source) => {
		// Arrange
		vi.stubEnv("INPUT_COMMUNITY-EVENT-URL-PREFIXES", source);

		// Act
		const read = () =>
			new PublicationUrlInput().readCommunityEventUrlPrefixes();

		// Assert
		expect(read).toThrow("Invalid input: community-event-url-prefixes");
	});

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
			// Each setting is validated independently.

			// Act
			const validateCommunity = () =>
				new PublicationUrlInput().validateCommunityEventUrlPrefixes([prefix]);
			const validateAssets = () =>
				new PublicationUrlInput().validateAssetFolderUrlPrefix(prefix);

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
	])("requires the Meetup group event prefix: %s", (prefix) => {
		// Arrange
		const parser = new PublicationUrlInput();

		// Act
		const validate = () => parser.validateMeetupEventUrlPrefix(prefix);

		// Assert
		expect(validate).toThrow("Invalid input: meetup-event-url-prefix");
	});

	it("copies the validated community prefixes", () => {
		// Arrange
		const prefixes = ["https://events.example.test/"];

		// Act
		const result = new PublicationUrlInput().validateCommunityEventUrlPrefixes(
			prefixes,
		);

		// Assert
		expect(result).toEqual(prefixes);
		expect(result).not.toBe(prefixes);
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
			new PublicationUrlInput().readCommunityEventUrlPrefixes();
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
