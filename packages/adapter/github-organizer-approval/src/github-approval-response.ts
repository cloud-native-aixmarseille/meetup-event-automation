import { ApprovalSchema } from "./approval-schema.js";
import type {
	ApprovalComment,
	ApprovalCommentEdit,
	ApprovalContentEdit,
} from "./github-approval-contracts.js";

interface ApprovalHistoryPage {
	readonly nodes: readonly ApprovalContentEdit[];
	readonly pageInfo: {
		readonly hasNextPage: boolean;
		readonly endCursor: string | null;
	};
}

/** Decode GitHub responses before permission and revision checks consume them. */
export class GithubApprovalResponse {
	static comments(value: unknown): {
		data: readonly ApprovalComment[];
		headers: { link?: string };
	} {
		if (
			!ApprovalSchema.object(value) ||
			!Array.isArray(value.data) ||
			!value.data.every(GithubApprovalResponse.comment) ||
			!ApprovalSchema.object(value.headers) ||
			(value.headers.link !== undefined &&
				typeof value.headers.link !== "string")
		)
			throw new Error("Invalid approval comment response");
		return { data: value.data, headers: { link: value.headers.link } };
	}

	static identity(value: unknown): number {
		if (
			!ApprovalSchema.object(value) ||
			!ApprovalSchema.object(value.data) ||
			!ApprovalSchema.count(value.data.id) ||
			value.data.id === 0
		)
			throw new Error("Invalid approval comment identity");
		return value.data.id;
	}

	static permission(value: unknown): string {
		if (
			!ApprovalSchema.object(value) ||
			!ApprovalSchema.object(value.data) ||
			typeof value.data.permission !== "string"
		)
			throw new Error("Invalid approval permission response");
		return value.data.permission;
	}

	static edit(value: unknown, comment: ApprovalComment): ApprovalCommentEdit {
		const node = GithubApprovalResponse.snapshot(value, comment);
		if (
			!GithubApprovalResponse.nullableText(node.lastEditedAt) ||
			!GithubApprovalResponse.actor(node.editor)
		)
			throw new Error("Invalid approval editor response");
		return {
			id: node.id,
			body: node.body,
			lastEditedAt: node.lastEditedAt,
			editor: node.editor,
		};
	}

	static history(
		value: unknown,
		comment: ApprovalComment,
	): ApprovalHistoryPage {
		const node = GithubApprovalResponse.snapshot(value, comment);
		const history = node.userContentEdits;
		if (
			!ApprovalSchema.object(history) ||
			!Array.isArray(history.nodes) ||
			!history.nodes.every(GithubApprovalResponse.historyEdit) ||
			!ApprovalSchema.object(history.pageInfo) ||
			typeof history.pageInfo.hasNextPage !== "boolean" ||
			!GithubApprovalResponse.nullableText(history.pageInfo.endCursor)
		)
			throw new Error("Approval history is unavailable");
		return {
			nodes: history.nodes,
			pageInfo: {
				hasNextPage: history.pageInfo.hasNextPage,
				endCursor: history.pageInfo.endCursor,
			},
		};
	}

	private static snapshot(
		value: unknown,
		comment: ApprovalComment,
	): Record<string, unknown> & { id: string; body: string } {
		if (
			!ApprovalSchema.object(value) ||
			!ApprovalSchema.object(value.node) ||
			typeof value.node.id !== "string" ||
			typeof value.node.body !== "string" ||
			value.node.id !== comment.node_id ||
			value.node.body !== comment.body
		)
			throw new Error("Approval comment changed during verification");
		return { ...value.node, id: value.node.id, body: value.node.body };
	}

	private static comment(value: unknown): value is ApprovalComment {
		return (
			ApprovalSchema.object(value) &&
			ApprovalSchema.count(value.id) &&
			value.id > 0 &&
			(value.node_id === undefined || typeof value.node_id === "string") &&
			(value.body === undefined ||
				GithubApprovalResponse.nullableText(value.body)) &&
			(value.user === undefined ||
				value.user === null ||
				(ApprovalSchema.object(value.user) &&
					typeof value.user.login === "string"))
		);
	}

	private static historyEdit(value: unknown): value is ApprovalContentEdit {
		return (
			ApprovalSchema.object(value) &&
			GithubApprovalResponse.nullableText(value.diff) &&
			GithubApprovalResponse.nullableText(value.deletedAt) &&
			GithubApprovalResponse.actor(value.editor)
		);
	}

	private static actor(value: unknown): value is ApprovalCommentEdit["editor"] {
		return (
			value === null ||
			(ApprovalSchema.object(value) &&
				typeof value.login === "string" &&
				typeof value.__typename === "string")
		);
	}

	private static nullableText(value: unknown): value is string | null {
		return value === null || typeof value === "string";
	}
}
