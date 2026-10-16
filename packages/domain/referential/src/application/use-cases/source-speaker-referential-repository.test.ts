import { describe, expect, it, vi } from "vitest";
import { ProposalSourceError } from "../../domain/proposal-source-error.js";
import type { RawReferentialCatalog } from "../../domain/referential-catalog.js";
import type { ProposalSnapshot } from "../ports/proposal-source.js";
import { SourceSpeakerReferentialRepository } from "./source-speaker-referential-repository.js";
import { ValidateReferentialCatalog } from "./validate-referential-catalog.js";

const scope = { provider: "conference-hall", event: "example-cfp" };
const local: RawReferentialCatalog = {
	hosts: [],
	speakers: [
		{
			speakerId: "speaker-0042",
			displayName: "Old Name",
			email: "old@example.test",
			firstName: "Local",
			lastName: "Name",
			company: "Old Company",
			phone: "local phone",
			pictureUrl: "https://example.test/old.png",
			sourceProvider: scope.provider,
			sourceEvent: scope.event,
			sourceSpeakerId: "source-one",
		},
	],
};
const snapshot: ProposalSnapshot = {
	...scope,
	proposals: [],
	speakers: [
		{
			id: "source-one",
			displayName: "Current Name",
			email: "current@example.test",
			company: "Current Company",
			pictureUrl: "https://example.test/current.png",
		},
	],
};

describe("source-first speaker referentials", () => {
	it("uses current profiles without mutating local IDs, contacts or the checked-out CSV", async () => {
		// Arrange
		const load = vi.fn().mockResolvedValue(snapshot);
		const repository = new SourceSpeakerReferentialRepository(
			{ load: async () => local },
			{ load },
			scope,
		);

		// Act
		const current = await repository.load();
		const again = await repository.load();

		// Assert
		expect(current.speakers[0]).toEqual({
			...local.speakers[0],
			displayName: "Current Name",
			email: "current@example.test",
			company: "Current Company",
			pictureUrl: "https://example.test/current.png",
		});
		expect(local.speakers[0].email).toBe("old@example.test");
		expect(again).toBe(current);
		expect(load).toHaveBeenCalledOnce();
	});
	it.each([undefined, null, ""])(
		"clears source-owned optional fields when the source supplies %s",
		async (value) => {
			// Arrange
			const source = {
				load: async () => ({
					...snapshot,
					speakers: [
						{ ...snapshot.speakers[0], company: value, pictureUrl: value },
					],
				}),
			};
			const repository = new SourceSpeakerReferentialRepository(
				{ load: async () => local },
				source,
				scope,
			);
			// Act
			const current = await repository.load();
			// Assert
			expect(current.speakers[0]).toMatchObject({
				company: "",
				pictureUrl: "",
				phone: "local phone",
			});
		},
	);
	it.each(["unavailable", "rate-limited", "invalid"] as const)(
		"rejects cached contacts when the source is %s",
		async (code) => {
			// Arrange
			const source = {
				load: vi.fn().mockRejectedValue(new ProposalSourceError(code)),
			};
			const repository = new SourceSpeakerReferentialRepository(
				{ load: async () => local },
				source,
				scope,
			);
			const validate = new ValidateReferentialCatalog(repository);
			// Act
			const result = await validate.execute();
			await validate.execute();
			// Assert
			expect(result).toMatchObject({
				isValid: false,
				diagnostics: [{ code: `referential.source.${code}` }],
			});
			expect(JSON.stringify(result)).not.toContain("old@example.test");
			expect(source.load).toHaveBeenCalledOnce();
		},
	);
	it("reports a missing linked profile instead of falling back or deleting the local record", async () => {
		// Arrange
		const source = { load: async () => ({ ...snapshot, speakers: [] }) };
		const repository = new SourceSpeakerReferentialRepository(
			{ load: async () => local },
			source,
			scope,
		);

		// Act
		const result = await new ValidateReferentialCatalog(repository).execute();

		// Assert
		expect(result).toMatchObject({
			isValid: false,
			diagnostics: [{ code: "referential.source.mapping-required" }],
		});
		expect(local.speakers).toHaveLength(1);
	});
	it("keeps unlinked and other-CFP rows local without requesting unrelated profiles", async () => {
		// Arrange
		const rows = [
			{
				...local.speakers[0],
				sourceProvider: undefined,
				sourceEvent: undefined,
				sourceSpeakerId: undefined,
			},
			{ ...local.speakers[0], sourceEvent: "other-cfp" },
		];
		const catalog = { ...local, speakers: rows };
		const source = { load: vi.fn() };
		const repository = new SourceSpeakerReferentialRepository(
			{ load: async () => catalog },
			source,
			scope,
		);

		// Act
		const result = await repository.load();

		// Assert
		expect(result).toBe(catalog);
		expect(source.load).not.toHaveBeenCalled();
	});
	it("normalizes mapping whitespace before resolving the authoritative profile", async () => {
		// Arrange
		const catalog = {
			...local,
			speakers: [
				{
					...local.speakers[0],
					sourceProvider: " conference-hall ",
					sourceEvent: " example-cfp ",
					sourceSpeakerId: " source-one ",
				},
			],
		};
		const repository = new SourceSpeakerReferentialRepository(
			{ load: async () => catalog },
			{ load: async () => snapshot },
			scope,
		);

		// Act
		const result = await repository.load();

		// Assert
		expect(result.speakers[0].displayName).toBe("Current Name");
	});
	it.each([
		{ ...snapshot, event: "another-cfp" },
		{ ...snapshot, speakers: [snapshot.speakers[0], snapshot.speakers[0]] },
	])(
		"rejects mismatched scope or ambiguous source identities",
		async (response) => {
			// Arrange
			const repository = new SourceSpeakerReferentialRepository(
				{ load: async () => local },
				{ load: async () => response },
				scope,
			);
			// Act
			const result = await new ValidateReferentialCatalog(repository).execute();
			// Assert
			expect(result.isValid).toBe(false);
		},
	);
	it("sanitizes unexpected provider failures instead of returning private data", async () => {
		// Arrange
		const repository = new SourceSpeakerReferentialRepository(
			{ load: async () => local },
			{
				load: async () => {
					throw new Error("private@example.test");
				},
			},
			scope,
		);

		// Act
		const result = await new ValidateReferentialCatalog(repository).execute();

		// Assert
		expect(result).toMatchObject({
			isValid: false,
			diagnostics: [{ code: "referential.source.unavailable" }],
		});
		expect(JSON.stringify(result)).not.toContain("private@example.test");
	});
});
