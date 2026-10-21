import type {
	AttentionComment,
	AttentionCommentEdit,
	AttentionContentEdit,
} from "./github-attention-contracts.js";
/** Narrows GitHub payloads before any author/history decision can use them. */
export class GithubAttentionResponse {
	record(value: unknown): Record<string, unknown> {
		if (!value || typeof value !== "object" || Array.isArray(value))
			throw new Error("Invalid attention API object");
		return value as Record<string, unknown>;
	}
	comment(value: unknown): AttentionComment {
		const data = this.record(value);
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
			const actor = this.record(data.user);
			if (
				typeof actor.login !== "string" ||
				(actor.type !== undefined && typeof actor.type !== "string")
			)
				throw new Error("Invalid attention comment author");
			user = { login: actor.login, type: actor.type };
		}
		return { id: data.id, body: data.body, node_id: data.node_id, user };
	}
	current(value: unknown, comment: AttentionComment): AttentionCommentEdit {
		const node = this.node(value, comment);
		return {
			id: node.id,
			body: node.body,
			lastEditedAt: this.nullableText(node.lastEditedAt),
			editor: this.editor(node.editor),
		};
	}
	history(value: unknown, comment: AttentionComment) {
		const node = this.node(value, comment);
		const edits = this.record(node.userContentEdits);
		const page = this.record(edits.pageInfo);
		if (!Array.isArray(edits.nodes) || typeof page.hasNextPage !== "boolean")
			throw new Error("Attention history is unavailable");
		return {
			nodes: edits.nodes.map(this.edit.bind(this)),
			hasNextPage: page.hasNextPage,
			endCursor: this.nullableText(page.endCursor),
		};
	}
	private node(
		value: unknown,
		comment: AttentionComment,
	): Record<string, unknown> & { id: string; body: string } {
		const result = this.record(value);
		const node = this.record(result.node);
		if (
			typeof node.id !== "string" ||
			typeof node.body !== "string" ||
			node.id !== comment.node_id ||
			node.body !== comment.body
		)
			throw new Error("Attention comment changed during verification");
		return { ...node, id: node.id, body: node.body };
	}
	private edit(value: unknown): AttentionContentEdit {
		const data = this.record(value);
		return {
			diff: this.nullableText(data.diff),
			deletedAt: this.nullableText(data.deletedAt),
			editor: this.editor(data.editor),
		};
	}
	private nullableText(value: unknown): string | null {
		if (value !== null && typeof value !== "string")
			throw new Error("Invalid attention API text");
		return value;
	}
	private editor(value: unknown): AttentionCommentEdit["editor"] {
		if (value === null) return null;
		const actor = this.record(value);
		if (typeof actor.login !== "string" || typeof actor.__typename !== "string")
			throw new Error("Invalid attention editor");
		return { login: actor.login, __typename: actor.__typename };
	}
}
