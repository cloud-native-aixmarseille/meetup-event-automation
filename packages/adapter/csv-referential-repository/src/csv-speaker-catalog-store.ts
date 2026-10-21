import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	ProposalSourceError,
	type RawSpeakerRecord,
	type SpeakerCatalogDocument,
	type SpeakerCatalogEntry,
	type SpeakerCatalogStore,
} from "@meetup-automation/referential";
import type {
	CsvReferentialRepository,
	CsvReferentialRepositoryArguments,
} from "./csv-referential-repository.js";
import type {
	SpeakerAllocationHistory,
	SpeakerAllocationHistoryArguments,
} from "./speaker-allocation-history.js";
import type { SpeakerAllocationStateCodec } from "./speaker-allocation-state-codec.js";
import type { SpeakerCatalogCsv } from "./speaker-catalog-csv.js";

export interface CsvSpeakerCatalogStoreCollaborators {
	readonly speakerCatalogCsv: Pick<SpeakerCatalogCsv, "decode" | "encode">;
	readonly speakerAllocationStateCodec: Pick<
		SpeakerAllocationStateCodec,
		"decode" | "encode"
	>;
	readonly createSpeakerAllocationHistory: (
		...args: SpeakerAllocationHistoryArguments
	) => SpeakerAllocationHistory;
	readonly createCsvReferentialRepository: (
		...args: CsvReferentialRepositoryArguments
	) => CsvReferentialRepository;
}

export class CsvSpeakerCatalogStore implements SpeakerCatalogStore {
	constructor(
		private readonly collaborators: CsvSpeakerCatalogStoreCollaborators,
		private readonly root: string,
		private readonly history: Pick<
			SpeakerAllocationHistory,
			"read"
		> = collaborators.createSpeakerAllocationHistory(root),
	) {}

	async read(): Promise<SpeakerCatalogDocument> {
		const { csv, state, historicalIds } = await this.sources();
		return {
			entries: this.collaborators.speakerCatalogCsv.decode(csv),
			reservedIds:
				state === undefined
					? historicalIds
					: this.collaborators.speakerAllocationStateCodec.decode(state),
			revision: this.revision(csv, state, historicalIds),
		};
	}

	async candidate(entries: readonly SpeakerCatalogEntry[]) {
		const existing = await this.collaborators
			.createCsvReferentialRepository({
				workspaceRoot: this.root,
				hostsPath: "referentials/hosting.csv",
				speakersPath: "referentials/speakers.csv",
			})
			.load();
		return {
			hosts: existing.hosts,
			speakers: entries.map(
				(entry): RawSpeakerRecord => ({
					speakerId: entry.id,
					displayName: entry.displayName,
					firstName: entry.firstName,
					lastName: entry.lastName,
					company: entry.company,
					email: entry.email,
					phone: entry.phone,
					pictureUrl: entry.pictureUrl,
					sourceProvider: entry.sourceIdentity?.provider,
					sourceEvent: entry.sourceIdentity?.event,
					sourceSpeakerId: entry.sourceIdentity?.speakerId,
				}),
			),
		};
	}

	async save(
		original: SpeakerCatalogDocument,
		entries: readonly SpeakerCatalogEntry[],
		reservedIds: readonly string[],
	): Promise<boolean> {
		const current = await this.sources();
		if (
			this.revision(current.csv, current.state, current.historicalIds) !==
			original.revision
		)
			throw new ProposalSourceError("conflict");
		// Reload the exact revision rather than relying on per-instance cached CSV state.
		const csv = this.collaborators.speakerCatalogCsv.encode(
			current.csv,
			entries,
		);
		const stateText =
			this.collaborators.speakerAllocationStateCodec.encode(reservedIds);
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
		let state: string | undefined;
		try {
			state = await readFile(
				join(this.root, "referentials/speaker-sync-state.json"),
				"utf8",
			);
		} catch (error) {
			if (
				!(error instanceof Error) ||
				!("code" in error) ||
				error.code !== "ENOENT"
			)
				throw error;
		}
		const historicalIds = state === undefined ? await this.history.read() : [];
		return { csv, state, historicalIds };
	}

	private revision(
		csv: string,
		state: string | undefined,
		historicalIds: readonly string[],
	): string {
		// Exact source bytes form the optimistic concurrency token, including formatting.
		return createHash("sha256")
			.update(JSON.stringify([csv, state, historicalIds]))
			.digest("hex");
	}
}
export type CsvSpeakerCatalogStoreArguments =
	ConstructorParameters<typeof CsvSpeakerCatalogStore> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
