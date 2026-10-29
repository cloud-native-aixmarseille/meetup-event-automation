import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PublicationDomainComposition } from "@meetup-automation/publication";
import { describe, expect, it } from "vitest";
import { RuntimeInput } from "../runtime-input.js";
import { AssetRecoveryInput } from "./asset-recovery-input.js";

function subject() {
	return new AssetRecoveryInput({
		runtimeInput: new RuntimeInput(),
		contentContractPolicy:
			new PublicationDomainComposition().contentContractPolicy(),
	});
}

describe("asset recovery requests", () => {
	it("requires no maintenance file for ordinary rendering", async () => {
		// Arrange
		const root = await mkdtemp(join(tmpdir(), "asset-recovery-"));
		const reader = subject();
		// Act
		const result = await reader.load(root, "community/events#42");
		await rm(root, { recursive: true });
		// Assert
		expect(result).toEqual({});
	});
	it("reads only revision-bound operations for the selected event", async () => {
		// Arrange
		const root = await mkdtemp(join(tmpdir(), "asset-recovery-"));
		await mkdir(join(root, ".github"));
		const restore = {
			operation: "restore",
			revision: "current",
			bindingId: "title",
		};
		await writeFile(
			join(root, ".github/meetup-asset-recovery.json"),
			JSON.stringify({
				version: 1,
				events: {
					"community/events#42": { copy: restore },
					"community/events#43": {
						another: { operation: "enroll", revision: "1" },
					},
				},
			}),
		);
		const reader = subject();
		// Act
		const result = await reader.load(root, "community/events#42");
		await rm(root, { recursive: true });
		// Assert
		expect(result).toEqual({ copy: restore });
	});
	it.each([
		{ operation: "restore", revision: "1" },
		{ operation: "unknown", revision: "1" },
		{ operation: "enroll" },
		{ operation: "enroll", revision: "1", fields: [] },
	])("rejects invalid maintenance operations", (operation) => {
		// Arrange
		const reader = subject();
		// Act
		let failure: unknown;
		try {
			reader.parse(
				{ version: 1, events: { "community/events#42": { copy: operation } } },
				"community/events#42",
			);
		} catch (error) {
			failure = error;
		}
		// Assert
		expect(failure).toBeInstanceOf(Error);
	});
});
