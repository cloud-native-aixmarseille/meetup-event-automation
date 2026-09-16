import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import type {
	RawHostRecord,
	RawReferentialCatalog,
	RawSpeakerRecord,
	ReferentialRepository,
} from "@meetup-automation/referential";
import { parse } from "csv-parse/sync";
import type {
	CsvReferentialRepositoryOptions,
	CsvRow,
} from "./csv-referential-repository-contracts.js";

export class CsvReferentialRepository implements ReferentialRepository {
	constructor(private readonly options: CsvReferentialRepositoryOptions) {}

	async load(): Promise<RawReferentialCatalog> {
		const [hostsSource, speakersSource] = await Promise.all([
			readFile(
				CsvReferentialRepository.localPath(
					this.options.workspaceRoot,
					this.options.hostsPath,
				),
				"utf8",
			),
			readFile(
				CsvReferentialRepository.localPath(
					this.options.workspaceRoot,
					this.options.speakersPath,
				),
				"utf8",
			),
		]);

		const hosts: RawHostRecord[] = CsvReferentialRepository.parseRows(
			hostsSource,
		).map(({ row, line }) => ({
			source: { path: this.options.hostsPath, line },
			hostId: row.host_id,
			displayName: row.name,
			contactId: row.contact_id,
			contactName: row.contact,
			email: row.mail,
			phone: row.phone || undefined,
			address: row.address,
		}));

		const speakers: RawSpeakerRecord[] = CsvReferentialRepository.parseRows(
			speakersSource,
		).map(({ row, line }) => ({
			source: { path: this.options.speakersPath, line },
			speakerId: row.speaker_id,
			firstName: row.firstname,
			lastName: row.lastname,
			company: row.company,
			email: row.mail,
			phone: row.phone || undefined,
		}));

		return { hosts, speakers };
	}

	private static localPath(rootInput: string, relativeInput: string): string {
		const root = resolve(rootInput);
		const absolute = resolve(root, relativeInput);
		const child = relative(root, absolute);
		if (
			isAbsolute(child) ||
			child === ".." ||
			child.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`)
		) {
			throw new Error(
				`Referential path must stay inside the checkout: ${relativeInput}`,
			);
		}
		return absolute;
	}

	private static parseRows(source: string): { row: CsvRow; line: number }[] {
		// Normalize line endings so parser locations count physical lines consistently,
		// including CRLF inside quoted fields. Blank lines do not represent records.
		const records = parse(source.replace(/\r\n?/g, "\n"), {
			bom: true,
			columns: true,
			skip_empty_lines: true,
			trim: true,
			info: true,
			raw: true,
		}) as { record: CsvRow; info: { lines: number }; raw: string }[];
		return records.map(({ record, info, raw }) => ({
			row: record,
			line:
				info.lines -
				(raw.trimStart().replace(/\n$/, "").match(/\n/g)?.length ?? 0),
		}));
	}
}
