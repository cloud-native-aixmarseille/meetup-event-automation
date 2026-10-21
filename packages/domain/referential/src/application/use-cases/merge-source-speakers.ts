import { ProposalSourceError } from "../../domain/proposal-source-error.js";
import type { SpeakerCatalogEntry } from "../../domain/speaker-catalog-entry.js";
import type { ProposalSnapshot } from "../ports/proposal-source.js";

/** Merge source-owned fields only. Never infer identity from a name or email. */
export class MergeSourceSpeakers {
	execute(
		entries: readonly SpeakerCatalogEntry[],
		snapshot: ProposalSnapshot,
		reservedIds: readonly string[],
	) {
		const reserved = new Set([...reservedIds, ...entries.map((row) => row.id)]);
		const mappings = this.mappings(entries, snapshot);
		const merged = entries.map((row) => ({ ...row }));
		for (const speaker of [...snapshot.speakers].sort((a, b) =>
			a.id.localeCompare(b.id, "en"),
		)) {
			let index = mappings.get(speaker.id);
			if (index === undefined) {
				const possibleMatch = entries.findIndex(
					(row) =>
						!row.sourceIdentity?.speakerId &&
						(row.email?.trim().toLowerCase() === speaker.email.toLowerCase() ||
							(row.displayName || `${row.firstName} ${row.lastName}`)
								.trim()
								.toLowerCase() === speaker.displayName.toLowerCase()),
				);
				if (possibleMatch !== -1)
					throw new ProposalSourceError("mapping-required", undefined, {
						field: `speakers[${possibleMatch}]`,
					});
				const id = this.allocate(reserved);
				index = merged.length;
				merged.push({
					id,
					firstName: "",
					lastName: "",
					phone: "",
					displayName: "",
					email: "",
					company: "",
					pictureUrl: "",
					sourceIdentity: {
						provider: snapshot.provider,
						event: snapshot.event,
						speakerId: speaker.id,
					},
				});
				mappings.set(speaker.id, index);
			}
			const row = merged[index];
			row.displayName = speaker.displayName;
			row.email = speaker.email;
			row.company = speaker.company ?? "";
			row.pictureUrl = speaker.pictureUrl ?? "";
		}
		return {
			entries: merged,
			reservedIds: [...reserved].sort(),
		};
	}
	private mappings(
		entries: readonly SpeakerCatalogEntry[],
		snapshot: ProposalSnapshot,
	): Map<string, number> {
		const mappings = new Map<string, number>();
		for (const [index, row] of entries.entries()) {
			if (
				row.sourceIdentity?.provider !== snapshot.provider ||
				row.sourceIdentity?.event !== snapshot.event
			)
				continue;
			if (
				!row.sourceIdentity?.speakerId ||
				mappings.has(row.sourceIdentity?.speakerId)
			)
				throw new ProposalSourceError("conflict");
			mappings.set(row.sourceIdentity?.speakerId, index);
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
