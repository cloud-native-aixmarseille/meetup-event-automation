import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CsvSpeakerCatalogStore } from "./csv-speaker-catalog-store.js";
import { CsvReferentialRepositoryComposition } from "./dependency-composition.js";

const directories: string[] = [];
const noHistory = { read: async () => [] };
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
	it.each([0, 1, 2, 3, 4, 55])(
		"writes formatter-valid allocation state with %i reservations and stable reruns",
		async (count) => {
			// Arrange
			const root = await workspace();
			const reservedIds = Array.from(
				{ length: count },
				(_, index) => `speaker-${String(index + 1).padStart(4, "0")}`,
			);
			const records = reservedIds.map(
				(id) => `${id},Example,${id}@example.test`,
			);
			await writeFile(
				join(root, "referentials/speakers.csv"),
				`${["speaker_id,display_name,mail", ...records].join("\n")}\n`,
			);
			const config = JSON.parse(
				await readFile(
					new URL("../../../../biome.json", import.meta.url),
					"utf8",
				),
			);
			config.vcs.enabled = false;
			await writeFile(join(root, "biome.json"), JSON.stringify(config));
			const store = new CsvSpeakerCatalogStore(
				{
					speakerCatalogCsv:
						new CsvReferentialRepositoryComposition().speakerCatalogCsv(),
					speakerAllocationStateCodec:
						new CsvReferentialRepositoryComposition().speakerAllocationStateCodec(),
					createSpeakerAllocationHistory: (...args) =>
						new CsvReferentialRepositoryComposition().speakerAllocationHistory(
							...args,
						),
					createCsvReferentialRepository: (...args) =>
						new CsvReferentialRepositoryComposition().csvReferentialRepository(
							...args,
						),
				},
				root,
				noHistory,
			);
			const original = await store.read();
			const state = reservedIds;
			const formatter = fileURLToPath(
				new URL(
					"../../../../node_modules/@biomejs/biome/bin/biome",
					import.meta.url,
				),
			);

			// Act
			await store.save(original, original.entries, state);
			const current = await store.read();
			const unchanged = await store.save(current, current.entries, state);
			const formatted = await promisify(execFile)(
				process.execPath,
				[formatter, "format", "referentials/speaker-sync-state.json"],
				{ cwd: root, timeout: 10_000 },
			);

			// Assert
			expect(current.reservedIds).toEqual(state);
			expect(unchanged).toBe(false);
			expect(formatted.stderr).toBe("");
		},
	);
	it("round-trips unknown columns and local field whitespace and avoids repeated writes", async () => {
		// Arrange
		const root = await workspace();
		const store = new CsvSpeakerCatalogStore(
			{
				speakerCatalogCsv:
					new CsvReferentialRepositoryComposition().speakerCatalogCsv(),
				speakerAllocationStateCodec:
					new CsvReferentialRepositoryComposition().speakerAllocationStateCodec(),
				createSpeakerAllocationHistory: (...args) =>
					new CsvReferentialRepositoryComposition().speakerAllocationHistory(
						...args,
					),
				createCsvReferentialRepository: (...args) =>
					new CsvReferentialRepositoryComposition().csvReferentialRepository(
						...args,
					),
			},
			root,
			noHistory,
		);
		const original = await store.read();
		const state = ["speaker-0001"];

		// Act
		const changed = await new CsvSpeakerCatalogStore(
			{
				speakerCatalogCsv:
					new CsvReferentialRepositoryComposition().speakerCatalogCsv(),
				speakerAllocationStateCodec:
					new CsvReferentialRepositoryComposition().speakerAllocationStateCodec(),
				createSpeakerAllocationHistory: (...args) =>
					new CsvReferentialRepositoryComposition().speakerAllocationHistory(
						...args,
					),
				createCsvReferentialRepository: (...args) =>
					new CsvReferentialRepositoryComposition().csvReferentialRepository(
						...args,
					),
			},
			root,
			noHistory,
		).save(original, original.entries, state);
		const current = await store.read();
		const unchanged = await store.save(current, current.entries, state);
		const currentCsv = await readFile(
			join(root, "referentials/speakers.csv"),
			"utf8",
		);

		// Assert
		expect(changed).toBe(true);
		expect(unchanged).toBe(false);
		expect(current.entries[0]).toMatchObject({
			phone: "  local phone  ",
			id: "speaker-0001",
		});
		expect(currentCsv).toContain('"private, notes"');
	});
	it("rejects concurrent catalog edits before writing", async () => {
		// Arrange
		const root = await workspace();
		const store = new CsvSpeakerCatalogStore(
			{
				speakerCatalogCsv:
					new CsvReferentialRepositoryComposition().speakerCatalogCsv(),
				speakerAllocationStateCodec:
					new CsvReferentialRepositoryComposition().speakerAllocationStateCodec(),
				createSpeakerAllocationHistory: (...args) =>
					new CsvReferentialRepositoryComposition().speakerAllocationHistory(
						...args,
					),
				createCsvReferentialRepository: (...args) =>
					new CsvReferentialRepositoryComposition().csvReferentialRepository(
						...args,
					),
			},
			root,
			noHistory,
		);
		const original = await store.read();
		const modified =
			"speaker_id,display_name,mail\nspeaker-0009,Edited,edited@example.test\n";
		await writeFile(join(root, "referentials/speakers.csv"), modified);

		// Act
		const failure = await store
			.save(original, original.entries, original.reservedIds)
			.catch((error: unknown) => error);
		const currentCsv = await readFile(
			join(root, "referentials/speakers.csv"),
			"utf8",
		);

		// Assert
		expect(failure).toMatchObject({ message: "Proposal source conflict." });
		expect(currentCsv).toBe(modified);
	});
	it("loads deleted ID reservations before allocation and persists them without a workflow bootstrap", async () => {
		// Arrange
		const root = await workspace();
		const history = { read: vi.fn().mockResolvedValue(["speaker-0008"]) };
		const store = new CsvSpeakerCatalogStore(
			{
				speakerCatalogCsv:
					new CsvReferentialRepositoryComposition().speakerCatalogCsv(),
				speakerAllocationStateCodec:
					new CsvReferentialRepositoryComposition().speakerAllocationStateCodec(),
				createSpeakerAllocationHistory: (...args) =>
					new CsvReferentialRepositoryComposition().speakerAllocationHistory(
						...args,
					),
				createCsvReferentialRepository: (...args) =>
					new CsvReferentialRepositoryComposition().csvReferentialRepository(
						...args,
					),
			},
			root,
			history,
		);

		// Act
		const original = await store.read();
		await store.save(original, original.entries, original.reservedIds);
		const current = await store.read();

		// Assert
		expect(original.reservedIds).toEqual(["speaker-0008"]);
		expect(current.reservedIds).toEqual(original.reservedIds);
		expect(history.read).toHaveBeenCalledTimes(2);
	});

	it("rejects a changed historical reservation snapshot before persisting new IDs", async () => {
		// Arrange
		const root = await workspace();
		const history = {
			read: vi
				.fn()
				.mockResolvedValueOnce(["speaker-0008"])
				.mockResolvedValueOnce(["speaker-0009"]),
		};
		const store = new CsvSpeakerCatalogStore(
			{
				speakerCatalogCsv:
					new CsvReferentialRepositoryComposition().speakerCatalogCsv(),
				speakerAllocationStateCodec:
					new CsvReferentialRepositoryComposition().speakerAllocationStateCodec(),
				createSpeakerAllocationHistory: (...args) =>
					new CsvReferentialRepositoryComposition().speakerAllocationHistory(
						...args,
					),
				createCsvReferentialRepository: (...args) =>
					new CsvReferentialRepositoryComposition().csvReferentialRepository(
						...args,
					),
			},
			root,
			history,
		);
		const original = await store.read();
		const originalCsv = await readFile(
			join(root, "referentials/speakers.csv"),
			"utf8",
		);

		// Act
		const failure = await store
			.save(original, original.entries, original.reservedIds)
			.catch((error: unknown) => error);
		const currentCsv = await readFile(
			join(root, "referentials/speakers.csv"),
			"utf8",
		);

		// Assert
		expect(failure).toMatchObject({ code: "conflict" });
		expect(currentCsv).toBe(originalCsv);
	});

	it.each(["", "{broken", '{"version":2,"reservedIds":[]}'])(
		"rejects malformed existing allocation state without replacing it with history: %s",
		async (state) => {
			// Arrange
			const root = await workspace();
			await writeFile(
				join(root, "referentials/speaker-sync-state.json"),
				state,
			);
			const history = { read: vi.fn() };
			const store = new CsvSpeakerCatalogStore(
				{
					speakerCatalogCsv:
						new CsvReferentialRepositoryComposition().speakerCatalogCsv(),
					speakerAllocationStateCodec:
						new CsvReferentialRepositoryComposition().speakerAllocationStateCodec(),
					createSpeakerAllocationHistory: (...args) =>
						new CsvReferentialRepositoryComposition().speakerAllocationHistory(
							...args,
						),
					createCsvReferentialRepository: (...args) =>
						new CsvReferentialRepositoryComposition().csvReferentialRepository(
							...args,
						),
				},
				root,
				history,
			);

			// Act
			const result = store.read();

			// Assert
			await expect(result).rejects.toMatchObject({ code: "invalid" });
			expect(history.read).not.toHaveBeenCalled();
		},
	);
});
