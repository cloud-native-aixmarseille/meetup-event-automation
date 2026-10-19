import type {
	ContentProposal,
	ContentProposalStore,
	ContentProposalTransition,
	PromotionalContentFingerprint,
	PromotionalContentSnapshot,
} from "@meetup-automation/journey";
import {
	CONTENT_STATE_MARKER,
	type ContentProposalCodec,
} from "./content-proposal-codec.js";
import type { GithubApprovalClient } from "./github-approval-client.js";
import type { ApprovalComment } from "./github-approval-contracts.js";

/** One bot-owned state comment per proposal; prior revisions are never deleted. */
export class GithubContentProposalStore implements ContentProposalStore {
	constructor(
		private readonly client: GithubApprovalClient,
		private readonly author: string,
		private readonly codec: ContentProposalCodec,
		private readonly fingerprints: Pick<
			PromotionalContentFingerprint,
			"digest"
		>,
		private readonly transitions: Pick<ContentProposalTransition, "validate">,
	) {}
	async load(): Promise<PromotionalContentSnapshot> {
		const records = await this.records();
		const proposals = records.map((record) => record.proposal);
		return { revision: this.fingerprints.digest(proposals), proposals };
	}
	async save(
		previous: PromotionalContentSnapshot,
		proposals: readonly ContentProposal[],
	): Promise<PromotionalContentSnapshot> {
		const records = await this.records();
		if (
			this.fingerprints.digest(records.map((record) => record.proposal)) !==
			previous.revision
		)
			throw new Error("Content proposals changed before persistence");
		if (
			records.some(
				(record) =>
					!proposals.some((proposal) => proposal.id === record.proposal.id),
			)
		)
			throw new Error("Content proposal history cannot be removed");
		for (const proposal of proposals) {
			const existing = records.find(
				(record) => record.proposal.id === proposal.id,
			);
			const body = this.codec.write(proposal);
			if (existing) {
				this.transitions.validate(existing.proposal, proposal);
				await this.client.replace(
					existing.comment.id,
					existing.comment.body ?? "",
					body,
				);
			} else await this.client.create(body);
		}
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
	private async records(): Promise<
		readonly { comment: ApprovalComment; proposal: ContentProposal }[]
	> {
		const result: { comment: ApprovalComment; proposal: ContentProposal }[] =
			[];
		for (const comment of await this.client.list()) {
			if (
				comment.user?.login.toLowerCase() !== this.author.toLowerCase() ||
				comment.user.type !== "Bot"
			)
				continue;
			const edit = await this.client.edit(comment);
			if (
				edit.editor &&
				(edit.editor.__typename !== "Bot" ||
					edit.editor.login.toLowerCase().replace(/\[bot\]$/, "") !==
						this.author.toLowerCase().replace(/\[bot\]$/, ""))
			) {
				await this.requireUnrelated(comment);
				continue;
			}
			if (!edit.editor && edit.lastEditedAt !== null)
				throw new Error("Content proposal editor is unavailable");
			if (!edit.body.startsWith(CONTENT_STATE_MARKER)) continue;
			const proposal = this.codec.read(edit.body);
			if (result.some((record) => record.proposal.id === proposal.id))
				throw new Error("Ambiguous content proposal state");
			result.push({ comment, proposal });
		}
		return result;
	}
	private async requireUnrelated(comment: ApprovalComment): Promise<void> {
		for (const edit of await this.client.history(comment)) {
			if (edit.deletedAt) throw new Error("Content state history was deleted");
			if (
				edit.editor?.__typename !== "Bot" ||
				edit.editor.login.toLowerCase().replace(/\[bot\]$/, "") !==
					this.author.toLowerCase().replace(/\[bot\]$/, "")
			)
				continue;
			if (edit.diff === null || edit.diff.startsWith(CONTENT_STATE_MARKER))
				throw new Error("Content proposal state was edited outside automation");
			return;
		}
		throw new Error("Content proposal history could not be verified");
	}
}
