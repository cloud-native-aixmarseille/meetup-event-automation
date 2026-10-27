import { ATTENTION_MARKER, type AttentionRecord } from "./attention-record.js";
import type {
	GithubAttentionClient,
	GithubAttentionClientArguments,
} from "./github-attention-client.js";
import type { GithubAttentionApi } from "./github-attention-contracts.js";
import type {
	TrustedAttentionState,
	TrustedAttentionStateArguments,
} from "./trusted-attention-state.js";

/** Preserve notification authority only from a verified bot revision. */
export interface AttentionCommentRetentionCollaborators {
	readonly attentionRecord: Pick<AttentionRecord, "read">;
	readonly createGithubAttentionClient: (
		...args: GithubAttentionClientArguments
	) => GithubAttentionClient;
	readonly createTrustedAttentionState: (
		...args: TrustedAttentionStateArguments
	) => TrustedAttentionState;
}

export class AttentionCommentRetention {
	constructor(
		private readonly collaborators: AttentionCommentRetentionCollaborators,
		private readonly api: GithubAttentionApi,
		private readonly owner: string,
		private readonly repo: string,
		private readonly author: string,
	) {}
	async load(
		issueNumber: number,
		commentId: number,
		before: string,
	): Promise<{ readonly body: string; readonly retained: string }> {
		const client = this.collaborators.createGithubAttentionClient(
			this.api,
			this.owner,
			this.repo,
			issueNumber,
		);
		const comment = (await client.list()).find((item) => item.id === commentId);
		if (!comment || comment.body !== before)
			throw new Error("Diagnostic comment changed before persistence");
		const body = await this.collaborators
			.createTrustedAttentionState(client, this.author)
			.body(comment);
		const offset = body.indexOf(ATTENTION_MARKER);
		if (offset < 0) return { body, retained: "" };
		this.collaborators.attentionRecord.read(body);
		return {
			body: body.slice(0, offset).trimEnd(),
			retained: body.slice(offset),
		};
	}
}
export type AttentionCommentRetentionArguments =
	ConstructorParameters<typeof AttentionCommentRetention> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
