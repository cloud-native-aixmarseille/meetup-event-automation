import { ATTENTION_MARKER, AttentionRecord } from "./attention-record.js";
import { GithubAttentionClient } from "./github-attention-client.js";
import type { GithubAttentionApi } from "./github-attention-contracts.js";
import { TrustedAttentionState } from "./trusted-attention-state.js";

/** Preserve notification authority only from a verified bot revision. */
export class AttentionCommentRetention {
	constructor(
		private readonly api: GithubAttentionApi,
		private readonly owner: string,
		private readonly repo: string,
		private readonly author: string,
	) {}
	async load(
		issueNumber: number,
		commentId: number,
		before: string,
	): Promise<string> {
		const client = new GithubAttentionClient(
			this.api,
			this.owner,
			this.repo,
			issueNumber,
		);
		const comment = (await client.list()).find((item) => item.id === commentId);
		if (!comment || comment.body !== before)
			throw new Error("Diagnostic comment changed before persistence");
		const body = await new TrustedAttentionState(client, this.author).body(
			comment,
		);
		const offset = body.indexOf(ATTENTION_MARKER);
		if (offset < 0) return "";
		AttentionRecord.read(body);
		return body.slice(offset);
	}
}
