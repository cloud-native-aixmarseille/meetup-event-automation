import type {
	AttentionComment,
	AttentionCommentEdit,
	AttentionContentEdit,
} from "./github-attention-contracts.js";
/** Narrows GitHub payloads before any author/history decision can use them. */
export class GithubAttentionResponse {
	static record(value: unknown): Record<string, unknown> {
		if (!value || typeof value !== "object" || Array.isArray(value))
			throw new Error("Invalid attention API object");
		return value as Record<string, unknown>;
	}
	static comment(value: unknown): AttentionComment {
		const data = GithubAttentionResponse.record(value);
		if (
			typeof data.id !== "number" ||
			!Number.isSafeInteger(data.id) ||
			data.id <= 0
		)
			throw new Error("Invalid attention comment identity");
		if (
			data.body !== undefined &&
			data.body !== null &&
			typeof data.body !== "string"
		)
			throw new Error("Invalid attention comment body");
		if (data.node_id !== undefined && typeof data.node_id !== "string")
			throw new Error("Invalid attention comment node");
		let user: AttentionComment["user"];
		if (data.user !== null && data.user !== undefined) {
			const actor = GithubAttentionResponse.record(data.user);
			if (
				typeof actor.login !== "string" ||
				(actor.type !== undefined && typeof actor.type !== "string")
			)
				throw new Error("Invalid attention comment author");
			user = { login: actor.login, type: actor.type };
		}
		return { id: data.id, body: data.body, node_id: data.node_id, user };
	}
	static current(
		value: unknown,
		comment: AttentionComment,
	): AttentionCommentEdit {
		const node = GithubAttentionResponse.node(value, comment);
		return {
			id: node.id,
			body: node.body,
			lastEditedAt: GithubAttentionResponse.nullableText(node.lastEditedAt),
			editor: GithubAttentionResponse.editor(node.editor),
		};
	}
	static history(value: unknown, comment: AttentionComment) {
		const node = GithubAttentionResponse.node(value, comment);
		const edits = GithubAttentionResponse.record(node.userContentEdits);
		const page = GithubAttentionResponse.record(edits.pageInfo);
		if (!Array.isArray(edits.nodes) || typeof page.hasNextPage !== "boolean")
			throw new Error("Attention history is unavailable");
		return {
			nodes: edits.nodes.map(GithubAttentionResponse.edit),
			hasNextPage: page.hasNextPage,
			endCursor: GithubAttentionResponse.nullableText(page.endCursor),
		};
	}
	private static node(
		value: unknown,
		comment: AttentionComment,
	): Record<string, unknown> & { id: string; body: string } {
		const result = GithubAttentionResponse.record(value);
		const node = GithubAttentionResponse.record(result.node);
		if (
			typeof node.id !== "string" ||
			typeof node.body !== "string" ||
			node.id !== comment.node_id ||
			node.body !== comment.body
		)
			throw new Error("Attention comment changed during verification");
		return { ...node, id: node.id, body: node.body };
	}
	private static edit(value: unknown): AttentionContentEdit {
		const data = GithubAttentionResponse.record(value);
		return {
			diff: GithubAttentionResponse.nullableText(data.diff),
			deletedAt: GithubAttentionResponse.nullableText(data.deletedAt),
			editor: GithubAttentionResponse.editor(data.editor),
		};
	}
	private static nullableText(value: unknown): string | null {
		if (value !== null && typeof value !== "string")
			throw new Error("Invalid attention API text");
		return value;
	}
	private static editor(value: unknown): AttentionCommentEdit["editor"] {
		if (value === null) return null;
		const actor = GithubAttentionResponse.record(value);
		if (typeof actor.login !== "string" || typeof actor.__typename !== "string")
			throw new Error("Invalid attention editor");
		return { login: actor.login, __typename: actor.__typename };
	}
}
