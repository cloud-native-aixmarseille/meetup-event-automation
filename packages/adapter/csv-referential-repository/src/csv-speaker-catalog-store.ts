import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	ProposalSourceError,
	type RawSpeakerRecord,
	type SpeakerCatalogDocument,
	type SpeakerCatalogStore,
	type SpeakerCsvRow,
	type SpeakerSyncState,
} from "@meetup-automation/referential";
import { parse } from "csv-parse/sync";
import * as babelPlugin from "prettier/plugins/babel";
import * as estreePlugin from "prettier/plugins/estree";
import { format } from "prettier/standalone";
import { CsvReferentialRepository } from "./csv-referential-repository.js";

const IMPORT_COLUMNS = [
	"speaker_id",
	"firstname",
	"lastname",
	"company",
	"mail",
	"phone",
	"display_name",
	"picture_url",
	"source_provider",
	"source_event",
	"source_speaker_id",
];

export class CsvSpeakerCatalogStore implements SpeakerCatalogStore {
	constructor(private readonly root: string) {}
	async read(): Promise<SpeakerCatalogDocument> {
		const { csv, state } = await this.sources();
		const records = parse(csv, {
			bom: true,
			skip_empty_lines: true,
		}) as string[][];
		const columns = records.shift() ?? [];
		if (
			!columns.includes("speaker_id") ||
			new Set(columns).size !== columns.length
		)
			throw new ProposalSourceError("invalid");
		const rows = records.map((values) =>
			Object.fromEntries(
				columns.map((column, index) => [column, values[index]]),
			),
		);
		const parsed: unknown = state
			? JSON.parse(state)
			: { version: 1, reservedIds: [] };
		if (!this.validState(parsed)) throw new ProposalSourceError("invalid");
		return {
			columns,
			rows,
			state: parsed,
			revision: this.revision(csv, state),
		};
	}
	async candidate(rows: readonly SpeakerCsvRow[]) {
		const existing = await new CsvReferentialRepository({
			workspaceRoot: this.root,
			hostsPath: "referentials/hosting.csv",
			speakersPath: "referentials/speakers.csv",
		}).load();
		return {
			hosts: existing.hosts,
			speakers: rows.map(
				(row): RawSpeakerRecord => ({
					speakerId: row.speaker_id,
					displayName: row.display_name,
					firstName: row.firstname,
					lastName: row.lastname,
					company: row.company,
					email: row.mail,
					phone: row.phone,
					pictureUrl: row.picture_url,
					sourceProvider: row.source_provider,
					sourceEvent: row.source_event,
					sourceSpeakerId: row.source_speaker_id,
				}),
			),
		};
	}
	async save(
		original: SpeakerCatalogDocument,
		rows: readonly SpeakerCsvRow[],
		state: SpeakerSyncState,
	): Promise<boolean> {
		const current = await this.sources();
		if (this.revision(current.csv, current.state) !== original.revision)
			throw new ProposalSourceError("conflict");
		const columns = [...new Set([...original.columns, ...IMPORT_COLUMNS])];
		const lines = [
			columns,
			...rows.map((row) => columns.map((column) => row[column] ?? "")),
		];
		const csv = `${lines.map((row) => row.map((value) => (/[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value)).join(",")).join("\n")}\n`;
		const stateText = await format(JSON.stringify(state), {
			parser: "json",
			plugins: [babelPlugin, estreePlugin],
			useTabs: true,
		});
		if (csv === current.csv && stateText === current.state) return false;
		await writeFile(join(this.root, "referentials/speakers.csv"), csv, {
			mode: 0o600,
		});
		await writeFile(
			join(this.root, "referentials/speaker-sync-state.json"),
			stateText,
			{ mode: 0o600 },
		);
		return true;
	}
	private async sources() {
		const csv = await readFile(
			join(this.root, "referentials/speakers.csv"),
			"utf8",
		);
		let state = "";
		try {
			state = await readFile(
				join(this.root, "referentials/speaker-sync-state.json"),
				"utf8",
			);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
		}
		return { csv, state };
	}
	private revision(csv: string, state: string): string {
		return createHash("sha256")
			.update(JSON.stringify([csv, state]))
			.digest("hex");
	}
	private validState(value: unknown): value is SpeakerSyncState {
		if (!value || typeof value !== "object") return false;
		const state = value as SpeakerSyncState;
		return (
			state.version === 1 &&
			Array.isArray(state.reservedIds) &&
			state.reservedIds.every(
				(id) => typeof id === "string" && /^speaker-\d{4}$/.test(id),
			)
		);
	}
}
