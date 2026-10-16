import type {
	ProposalSnapshot,
	SpeakerCsvRow,
	SpeakerSyncState,
} from "../ports/proposal-source.js";
import { ProposalSourceError } from "../../domain/proposal-source-error.js";

/** Merge source-owned fields only. Never infer identity from a name or email. */
export class MergeSourceSpeakers {
	execute(
		rows: readonly SpeakerCsvRow[],
		snapshot: ProposalSnapshot,
		state: SpeakerSyncState,
	) {
		const reserved = new Set([
			...state.reservedIds,
			...rows.map((row) => row.speaker_id),
		]);
		const mappings = this.mappings(rows, snapshot);
		const merged = rows.map((row) => ({ ...row }));
		for (const speaker of [...snapshot.speakers].sort((a, b) =>
			a.id.localeCompare(b.id, "en"),
		)) {
			let index = mappings.get(speaker.id);
			if (index === undefined) {
				if (
					rows.some(
						(row) =>
							!row.source_speaker_id &&
							(row.mail?.trim().toLowerCase() === speaker.email.toLowerCase() ||
								(row.display_name || `${row.firstname} ${row.lastname}`)
									.trim()
									.toLowerCase() === speaker.displayName.toLowerCase()),
					)
				)
					throw new ProposalSourceError("mapping-required");
				const id = this.allocate(reserved);
				index = merged.length;
				merged.push({
					speaker_id: id,
					firstname: "",
					lastname: "",
					phone: "",
					source_provider: snapshot.provider,
					source_event: snapshot.event,
					source_speaker_id: speaker.id,
				});
				mappings.set(speaker.id, index);
			}
			const row = merged[index];
			row.display_name = speaker.displayName;
			row.mail = speaker.email;
			row.company = speaker.company ?? "";
			row.picture_url = speaker.pictureUrl ?? "";
		}
		return {
			rows: merged,
			state: { version: 1 as const, reservedIds: [...reserved].sort() },
		};
	}
	private mappings(
		rows: readonly SpeakerCsvRow[],
		snapshot: ProposalSnapshot,
	): Map<string, number> {
		const mappings = new Map<string, number>();
		for (const [index, row] of rows.entries()) {
			if (
				row.source_provider !== snapshot.provider ||
				row.source_event !== snapshot.event
			)
				continue;
			if (!row.source_speaker_id || mappings.has(row.source_speaker_id))
				throw new ProposalSourceError("conflict");
			mappings.set(row.source_speaker_id, index);
		}
		return mappings;
	}
	private allocate(reserved: Set<string>): string {
		const maximum = Math.max(
			0,
			...[...reserved].map((id) => Number(id.replace(/^speaker-/, ""))),
		);
		if (!Number.isInteger(maximum) || maximum >= 9999)
			throw new ProposalSourceError("conflict");
		const id = `speaker-${String(maximum + 1).padStart(4, "0")}`;
		reserved.add(id);
		return id;
	}
}
