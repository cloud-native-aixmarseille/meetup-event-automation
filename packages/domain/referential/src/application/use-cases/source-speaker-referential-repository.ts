import { ProposalSourceError } from "../../domain/proposal-source-error.js";
import type {
	RawReferentialCatalog,
	RawSpeakerRecord,
} from "../../domain/referential-catalog.js";
import type {
	ProposalSnapshot,
	ProposalSource,
} from "../ports/proposal-source.js";
import type { ReferentialRepository } from "../ports/referential-repository.js";

/** Source-owned profiles and local identity/contact supplements share one snapshot. */
export class SourceSpeakerReferentialRepository
	implements ReferentialRepository
{
	private snapshot?: Promise<RawReferentialCatalog>;

	constructor(
		private readonly local: ReferentialRepository,
		private readonly source: ProposalSource,
		private readonly scope: Pick<ProposalSnapshot, "provider" | "event">,
	) {}

	load(): Promise<RawReferentialCatalog> {
		this.snapshot ??= this.refresh();
		return this.snapshot;
	}

	private async refresh(): Promise<RawReferentialCatalog> {
		const catalog = await this.local.load();
		if (!catalog.speakers.some((row) => this.isLinked(row))) return catalog;
		const snapshot = await this.loadSource();
		const profiles = new Map(
			snapshot.speakers.map((speaker) => [speaker.id, speaker]),
		);
		if (profiles.size !== snapshot.speakers.length)
			throw new ProposalSourceError("conflict");
		const speakers = catalog.speakers.map((row) => {
			if (!this.isLinked(row)) return row;
			const speaker =
				typeof row.sourceSpeakerId === "string"
					? profiles.get(row.sourceSpeakerId.trim())
					: undefined;
			if (!speaker) throw new ProposalSourceError("mapping-required");
			return {
				...row,
				displayName: speaker.displayName,
				email: speaker.email,
				company: speaker.company ?? "",
				pictureUrl: speaker.pictureUrl ?? "",
			};
		});
		return { ...catalog, speakers };
	}

	private isLinked(row: RawSpeakerRecord): boolean {
		return (
			typeof row.sourceProvider === "string" &&
			row.sourceProvider.trim() === this.scope.provider &&
			typeof row.sourceEvent === "string" &&
			row.sourceEvent.trim() === this.scope.event
		);
	}

	private async loadSource(): Promise<ProposalSnapshot> {
		try {
			const snapshot = await this.source.load();
			if (
				snapshot.provider !== this.scope.provider ||
				snapshot.event !== this.scope.event
			)
				throw new ProposalSourceError("invalid");
			return snapshot;
		} catch (error) {
			throw error instanceof ProposalSourceError
				? error
				: new ProposalSourceError("unavailable");
		}
	}
}
export type SourceSpeakerReferentialRepositoryArguments = ConstructorParameters<
	typeof SourceSpeakerReferentialRepository
>;
