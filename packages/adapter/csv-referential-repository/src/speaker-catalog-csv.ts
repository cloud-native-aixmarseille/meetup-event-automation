import {
	ProposalSourceError,
	type SpeakerCatalogEntry,
} from "@meetup-automation/referential";
import { parse } from "csv-parse/sync";

type CsvRecord = Record<string, string>;
interface CsvDocument {
	columns: readonly string[];
	rows: readonly CsvRecord[];
}
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

/** Own CSV columns, escaping, and preservation of fields the source does not manage. */
export class SpeakerCatalogCsv {
	decode(source: string): readonly SpeakerCatalogEntry[] {
		return this.document(source).rows.map((row) => ({
			id: row.speaker_id ?? "",
			firstName: row.firstname ?? "",
			lastName: row.lastname ?? "",
			phone: row.phone ?? "",
			displayName: row.display_name ?? "",
			email: row.mail ?? "",
			company: row.company ?? "",
			pictureUrl: row.picture_url ?? "",
			...([row.source_provider, row.source_event, row.source_speaker_id].some(
				Boolean,
			)
				? {
						sourceIdentity: {
							provider: row.source_provider ?? "",
							event: row.source_event ?? "",
							speakerId: row.source_speaker_id ?? "",
						},
					}
				: {}),
		}));
	}

	encode(source: string, entries: readonly SpeakerCatalogEntry[]): string {
		const original = this.document(source);
		const columns = [...new Set([...original.columns, ...IMPORT_COLUMNS])];
		const records = new Map(original.rows.map((row) => [row.speaker_id, row]));
		if (
			records.size !== original.rows.length ||
			new Set(entries.map((entry) => entry.id)).size !== entries.length
		)
			throw new ProposalSourceError("conflict");
		const rows = entries.map((entry) => ({
			...records.get(entry.id),
			speaker_id: entry.id,
			firstname: entry.firstName,
			lastname: entry.lastName,
			phone: entry.phone,
			display_name: entry.displayName,
			mail: entry.email,
			company: entry.company,
			picture_url: entry.pictureUrl,
			source_provider: entry.sourceIdentity?.provider ?? "",
			source_event: entry.sourceIdentity?.event ?? "",
			source_speaker_id: entry.sourceIdentity?.speakerId ?? "",
		}));
		const lines = [
			columns,
			...rows.map((row: CsvRecord) =>
				columns.map((column) => row[column] ?? ""),
			),
		];
		return `${lines.map((row) => row.map(this.escape.bind(this)).join(",")).join("\n")}\n`;
	}

	private document(source: string): CsvDocument {
		const parsed: unknown = parse(source, {
			bom: true,
			skip_empty_lines: true,
		});
		if (!Array.isArray(parsed)) throw new ProposalSourceError("invalid");
		const records = parsed.map((row: unknown) => {
			if (
				!Array.isArray(row) ||
				!row.every((value): value is string => typeof value === "string")
			)
				throw new ProposalSourceError("invalid");
			return row;
		});
		const columns = records.shift() ?? [];
		if (
			!columns.includes("speaker_id") ||
			new Set(columns).size !== columns.length
		)
			throw new ProposalSourceError("invalid");
		return {
			columns,
			rows: records.map((values) =>
				Object.fromEntries(
					columns.map((column, index) => [column, values[index]]),
				),
			),
		};
	}

	private escape(value: string): string {
		return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
	}
}
