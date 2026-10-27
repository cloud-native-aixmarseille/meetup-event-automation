import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { RuntimeInput } from "./runtime-input.js";
import { SocialPublicationConfiguration } from "./social-publication-configuration.js";

const slack = {
	key: "engineering",
	provider: "slack",
	label: "Engineering",
	workspaceId: "TEXAMPLE",
	channelId: "CEXAMPLE",
};
const linkedin = {
	key: "community-page",
	provider: "linkedin",
	label: "Community",
	organizationUrn: "urn:li:organization:123",
};
const subject = new SocialPublicationConfiguration(new RuntimeInput());

describe("social publication configuration", () => {
	it("preserves explicitly configured identities across workspaces", () => {
		// Arrange
		const destinations = [
			slack,
			{ ...slack, key: "other", workspaceId: "TOTHER" },
			linkedin,
		];
		// Act
		const result = subject.parse({ version: 1, destinations });
		// Assert
		expect(result.destinations).toEqual(destinations);
	});
	it("keeps an empty destination list empty", () => {
		// Arrange
		const configuration = { version: 1, destinations: [] };
		// Act
		const result = subject.parse(configuration);
		// Assert
		expect(result.destinations).toEqual([]);
	});
	it.each([
		["missing list", { version: 1 }],
		["unknown root field", { version: 1, destinations: [], token: "secret" }],
		["unsupported version", { version: 2, destinations: [] }],
		[
			"duplicate key",
			{ version: 1, destinations: [slack, { ...slack, channelId: "COTHER" }] },
		],
		[
			"duplicate channel",
			{ version: 1, destinations: [slack, { ...slack, key: "duplicate" }] },
		],
		[
			"multiple Pages",
			{
				version: 1,
				destinations: [
					linkedin,
					{
						...linkedin,
						key: "other",
						organizationUrn: "urn:li:organization:456",
					},
				],
			},
		],
		[
			"too many destinations",
			{ version: 1, destinations: Array(51).fill(slack) },
		],
	])("rejects %s", (_name, value) => {
		// Arrange
		const input = value;
		// Act
		const parse = () => subject.parse(input);
		// Assert
		expect(parse).toThrow();
	});
	it.each([
		{ ...slack, key: "engineering:d7" },
		{ ...slack, key: "" },
		{ ...slack, label: "<channel>" },
		{ ...slack, workspaceId: "" },
		{ ...slack, channelId: "DPRIVATE" },
		{ ...slack, token: "secret" },
		{ ...slack, organizationUrn: linkedin.organizationUrn },
		{ ...linkedin, organizationUrn: "urn:li:person:123" },
		{ ...linkedin, provider: "unknown" },
	])("rejects invalid or credential-bearing destination %j", (destination) => {
		// Arrange
		const input = { version: 1, destinations: [destination] };
		// Act
		const parse = () => subject.parse(input);
		// Assert
		expect(parse).toThrow();
	});
	it("reloads removed channels instead of caching authorization", async () => {
		// Arrange
		const root = await mkdtemp(join(tmpdir(), "social-config-"));
		await mkdir(join(root, ".github"));
		const path = join(root, ".github/meetup-social.json");
		await writeFile(
			path,
			JSON.stringify({ version: 1, destinations: [slack] }),
		);
		try {
			// Act
			const before = await subject.load(root);
			await writeFile(path, JSON.stringify({ version: 1, destinations: [] }));
			const after = await subject.load(root);
			// Assert
			expect(before.destinations).toEqual([slack]);
			expect(after.destinations).toEqual([]);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
	it("rejects missing configuration without generating fallback destinations", async () => {
		// Arrange
		const root = await mkdtemp(join(tmpdir(), "social-config-"));
		try {
			// Act
			const result = subject.load(root);
			// Assert
			await expect(result).rejects.toThrow();
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
	it("does not expose file contents when configuration JSON is malformed", async () => {
		// Arrange
		const root = await mkdtemp(join(tmpdir(), "social-config-"));
		await mkdir(join(root, ".github"));
		await writeFile(join(root, ".github/meetup-social.json"), "private-token");
		try {
			// Act
			const result = subject.load(root);
			// Assert
			await expect(result).rejects.toThrow(
				/^Invalid social publication configuration JSON$/,
			);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
});
