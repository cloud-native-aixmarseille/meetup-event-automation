import type {
	RawHostRecord,
	RawReferentialCatalog,
	RawSpeakerRecord,
} from "@meetup-automation/referential";
import { parse } from "csv-parse/sync";
import type { CsvRow } from "./csv-referential-repository-contracts.js";

/** Map CSV column names and physical line locations to raw catalog values. */
export class CsvReferentialCodec {
	decode(
		hostsSource: string,
		speakersSource: string,
		hostsPath: string,
		speakersPath: string,
	): RawReferentialCatalog {
		const hosts: RawHostRecord[] = this.parseRows(hostsSource).map(
			({ row, line }) => ({
				source: { path: hostsPath, line },
				hostId: row.host_id,
				displayName: row.name,
				contactId: row.contact_id,
				contactName: row.contact,
				email: row.mail,
				phone: row.phone || undefined,
				address: row.address,
			}),
		);

		const speakers: RawSpeakerRecord[] = this.parseRows(speakersSource).map(
			({ row, line }) => ({
				source: { path: speakersPath, line },
				speakerId: row.speaker_id,
				displayName: row.display_name,
				pictureUrl: row.picture_url,
				sourceProvider: row.source_provider,
				sourceEvent: row.source_event,
				sourceSpeakerId: row.source_speaker_id,
				firstName: row.firstname,
				lastName: row.lastname,
				company: row.company,
				email: row.mail,
				phone: row.phone || undefined,
			}),
		);

		return { hosts, speakers };
	}

	private parseRows(source: string): { row: CsvRow; line: number }[] {
		// Normalize line endings so parser locations count physical lines consistently,
		// including CRLF inside quoted fields. Blank lines do not represent records.
		const records: unknown = parse(source.replace(/\r\n?/g, "\n"), {
			bom: true,
			columns: true,
			skip_empty_lines: true,
			trim: true,
			info: true,
			raw: true,
		});
		if (!Array.isArray(records)) throw new Error("Invalid CSV catalog records");
		return records.map((value: unknown) => {
			if (!this.record(value)) throw new Error("Invalid CSV catalog record");
			return {
				row: value.record,
				line:
					value.info.lines -
					(value.raw.trimStart().replace(/\n$/, "").match(/\n/g)?.length ?? 0),
			};
		});
	}

	private record(
		value: unknown,
	): value is { record: CsvRow; info: { lines: number }; raw: string } {
		if (!this.object(value)) return false;
		return (
			this.object(value.record) &&
			Object.values(value.record).every((item) => typeof item === "string") &&
			this.object(value.info) &&
			typeof value.info.lines === "number" &&
			Number.isSafeInteger(value.info.lines) &&
			value.info.lines > 0 &&
			typeof value.raw === "string"
		);
	}

	private object(value: unknown): value is Record<string, unknown> {
		return value !== null && typeof value === "object" && !Array.isArray(value);
	}
}
