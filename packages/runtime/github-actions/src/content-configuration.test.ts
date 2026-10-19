import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PublicAssetUrl } from "@meetup-automation/publication";
import { afterEach, describe, expect, it } from "vitest";
import { ContentConfiguration } from "./content-configuration.js";
import { RuntimeInput } from "./runtime-input.js";

const announcement = {
	sourceId: "announcement-source",
	sourceRevision: "revision-one",
	url: "https://images.example.test/announcement.png",
	description: "Cloud meetup announcement",
};
const configuration = {
	version: 1,
	months: { "2027-04": "Avril" },
	mentions: ["Example Organizer"],
	reminderTime: "09:00",
	guidance: "Keep the copy concise.",
	announcements: { "2027-04-05": announcement },
};
const subject = new ContentConfiguration(
	new RuntimeInput(),
	new PublicAssetUrl(),
);
const directories: string[] = [];

afterEach(async () => {
	await Promise.all(
		directories
			.splice(0)
			.map((path) => rm(path, { recursive: true, force: true })),
	);
});

describe("content configuration", () => {
	it("preserves explicit public content settings", () => {
		// Arrange
		const { version: _version, ...expected } = configuration;

		// Act
		const result = subject.parse(configuration);

		// Assert
		expect(result).toEqual(expected);
	});

	it("accepts empty optional collections and generation guidance", () => {
		// Arrange
		const input = {
			...configuration,
			months: {},
			mentions: [],
			announcements: {},
			guidance: "",
		};

		// Act
		const result = subject.parse(input);

		// Assert
		expect(result).toEqual({
			months: {},
			mentions: [],
			announcements: {},
			guidance: "",
			reminderTime: "09:00",
		});
	});

	it.each([
		["non-object", null],
		["array", []],
		["unsupported version", { ...configuration, version: 2 }],
		[
			"unknown property",
			{ ...configuration, privateContact: "private@example.test" },
		],
		["missing months", { ...configuration, months: undefined }],
		["invalid announcements", { ...configuration, announcements: [] }],
		["invalid mentions", { ...configuration, mentions: "Organizer" }],
		[
			"too many mentions",
			{ ...configuration, mentions: Array(21).fill("Organizer") },
		],
		["blank mention", { ...configuration, mentions: [""] }],
		["padded mention", { ...configuration, mentions: [" Organizer "] }],
		["non-text mention", { ...configuration, mentions: [42] }],
		["long mention", { ...configuration, mentions: ["a".repeat(101)] }],
		["invalid month", { ...configuration, months: { "2027-13": "Invalid" } }],
		["blank month label", { ...configuration, months: { "2027-04": " " } }],
		["missing reminder time", { ...configuration, reminderTime: undefined }],
		["invalid hour", { ...configuration, reminderTime: "24:00" }],
		["invalid minute", { ...configuration, reminderTime: "09:60" }],
		["invalid guidance", { ...configuration, guidance: false }],
		["oversized guidance", { ...configuration, guidance: "a".repeat(2001) }],
	])("rejects %s", (_label, input) => {
		// Arrange
		// Each input violates the public configuration contract.

		// Act
		const parse = () => subject.parse(input);

		// Assert
		expect(parse).toThrow();
	});

	it.each([
		["invalid date", "April 5", announcement],
		["non-object export", "2027-04-05", null],
		[
			"unknown export property",
			"2027-04-05",
			{ ...announcement, token: "private-token" },
		],
		[
			"insecure URL",
			"2027-04-05",
			{ ...announcement, url: "http://images.example.test/image.png" },
		],
		[
			"credential URL",
			"2027-04-05",
			{
				...announcement,
				url: "https://images.example.test/image.png?token=private",
			},
		],
		["missing source", "2027-04-05", { ...announcement, sourceId: "" }],
		["missing revision", "2027-04-05", { ...announcement, sourceRevision: "" }],
		["missing description", "2027-04-05", { ...announcement, description: "" }],
	])("rejects announcement with %s", (_label, date, exported) => {
		// Arrange
		const input = {
			...configuration,
			announcements: { [String(date)]: exported },
		};

		// Act
		const parse = () => subject.parse(input);

		// Assert
		expect(parse).toThrow();
	});

	it("loads and validates the repository content configuration", async () => {
		// Arrange
		const root = await repository(JSON.stringify(configuration));
		const { version: _version, ...expected } = configuration;

		// Act
		const result = await subject.load(root);

		// Assert
		expect(result).toEqual(expected);
	});

	it.each([
		["invalid JSON", "{"],
		["invalid configuration", '{"version":2}'],
		[
			"oversized UTF-8 content",
			JSON.stringify({ ...configuration, guidance: "é".repeat(50_000) }),
		],
	])("rejects a file containing %s", async (_label, content) => {
		// Arrange
		const root = await repository(content);

		// Act
		const result = subject.load(root);

		// Assert
		await expect(result).rejects.toThrow();
	});
});

async function repository(content: string) {
	const root = await mkdtemp(join(tmpdir(), "content-config-test-"));
	directories.push(root);
	await mkdir(join(root, ".github"));
	await writeFile(join(root, ".github/meetup-content.json"), content);
	return root;
}
