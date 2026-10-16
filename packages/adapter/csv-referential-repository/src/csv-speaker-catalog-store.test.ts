import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CsvSpeakerCatalogStore } from "./csv-speaker-catalog-store.js";

const directories: string[] = [];
afterEach(async () => {
	await Promise.all(
		directories
			.splice(0)
			.map((directory) => rm(directory, { recursive: true, force: true })),
	);
});
async function workspace() {
	const root = await mkdtemp(join(tmpdir(), "speaker-catalog-"));
	directories.push(root);
	await mkdir(join(root, "referentials"));
	await writeFile(
		join(root, "referentials/hosting.csv"),
		"host_id,name,contact_id,contact,mail,phone,address\n",
	);
	await writeFile(
		join(root, "referentials/speakers.csv"),
		'speaker_id,firstname,lastname,company,mail,phone,notes\nspeaker-0001,Alex,Example,,alex@example.test,"  local phone  ","private, notes"\n',
	);
	return root;
}

describe("CsvSpeakerCatalogStore", () => {
	it("round-trips unknown columns and local field whitespace and avoids repeated writes", async () => {
		// Arrange
		const root = await workspace();
		const store = new CsvSpeakerCatalogStore(root);
		const original = await store.read();
		const state = { version: 1 as const, reservedIds: ["speaker-0001"] };
		// Act
		const changed = await store.save(original, original.rows, state);
		const current = await store.read();
		const unchanged = await store.save(current, current.rows, state);
		// Assert
		expect(changed).toBe(true);
		expect(unchanged).toBe(false);
		expect(current.rows[0]).toMatchObject({
			phone: "  local phone  ",
			notes: "private, notes",
			speaker_id: "speaker-0001",
		});
	});
	it("rejects concurrent catalog edits before writing", async () => {
		// Arrange
		const root = await workspace();
		const store = new CsvSpeakerCatalogStore(root);
		const original = await store.read();
		const modified =
			"speaker_id,display_name,mail\nspeaker-0009,Edited,edited@example.test\n";
		await writeFile(join(root, "referentials/speakers.csv"), modified);
		// Act
		const save = store.save(original, original.rows, original.state);
		// Assert
		await expect(save).rejects.toThrow("Proposal source conflict.");
		expect(
			await readFile(join(root, "referentials/speakers.csv"), "utf8"),
		).toBe(modified);
	});
});
