import type {
	AutomationStateRepository,
	ContentProposal,
	ContentProposalStore,
	ContentProposalTransition,
	PromotionalContentFingerprint,
	PromotionalContentSnapshot,
} from "@meetup-automation/journey";
import type { ContentProposalCodec } from "./content-proposal-codec.js";

/** Preserve proposal identities and history inside the shared issue state. */
export class GithubContentProposalStore implements ContentProposalStore {
	constructor(
		private readonly state: Pick<AutomationStateRepository, "read" | "write">,
		private readonly codec: ContentProposalCodec,
		private readonly fingerprints: Pick<
			PromotionalContentFingerprint,
			"digest"
		>,
		private readonly transitions: Pick<ContentProposalTransition, "validate">,
	) {}
	async load(): Promise<PromotionalContentSnapshot> {
		const records = await this.records();
		const proposals = records.map((record) => this.codec.read(record));
		return { revision: this.fingerprints.digest(proposals), proposals };
	}
	async save(
		previous: PromotionalContentSnapshot,
		proposals: readonly ContentProposal[],
	): Promise<PromotionalContentSnapshot> {
		const records = await this.records();
		const current = records.map((record) => this.codec.read(record));
		if (this.fingerprints.digest(current) !== previous.revision)
			throw new Error("Content proposals changed before persistence");
		if (
			current.some(
				(record) => !proposals.some((proposal) => proposal.id === record.id),
			)
		)
			throw new Error("Content proposal history cannot be removed");
		for (const proposal of proposals) {
			const existing = current.find((record) => record.id === proposal.id);
			if (existing) this.transitions.validate(existing, proposal);
		}
		await this.state.write(
			"content",
			records,
			proposals.map((proposal) => this.codec.write(proposal)),
		);
		const saved = await this.load();
		if (
			proposals.some(
				(proposal) =>
					this.fingerprints.digest(
						saved.proposals.find((item) => item.id === proposal.id),
					) !== this.fingerprints.digest(proposal),
			)
		)
			throw new Error("Content persistence readback is uncertain");
		return saved;
	}
	private async records(): Promise<readonly string[]> {
		const records = await this.state.read("content");
		const ids = records.map((record) => this.codec.read(record).id);
		if (new Set(ids).size !== ids.length)
			throw new Error("Ambiguous content proposal state");
		return records;
	}
}
