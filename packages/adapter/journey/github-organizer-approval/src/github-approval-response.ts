import type { ApprovalSchema } from "./approval-schema.js";
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
export interface GithubApprovalResponseCollaborators {
	readonly approvalSchema: Pick<ApprovalSchema, "object" | "count">;
}

export class GithubApprovalResponse {
	constructor(
		private readonly collaborators: GithubApprovalResponseCollaborators,
	) {}

	comments(value: unknown): {
		data: readonly ApprovalComment[];
		headers: { link?: string };
	} {
		if (
			!this.collaborators.approvalSchema.object(value) ||
			!Array.isArray(value.data) ||
			!value.data.every(this.comment.bind(this)) ||
			!this.collaborators.approvalSchema.object(value.headers) ||
			(value.headers.link !== undefined &&
				typeof value.headers.link !== "string")
		)
			throw new Error("Invalid approval comment response");
		return { data: value.data, headers: { link: value.headers.link } };
	}

	identity(value: unknown): number {
		if (
			!this.collaborators.approvalSchema.object(value) ||
			!this.collaborators.approvalSchema.object(value.data) ||
			!this.collaborators.approvalSchema.count(value.data.id) ||
			value.data.id === 0
		)
			throw new Error("Invalid approval comment identity");
		return value.data.id;
	}

	permission(value: unknown): string {
		if (
			!this.collaborators.approvalSchema.object(value) ||
			!this.collaborators.approvalSchema.object(value.data) ||
			typeof value.data.permission !== "string"
		)
			throw new Error("Invalid approval permission response");
		return value.data.permission;
	}

	edit(value: unknown, comment: ApprovalComment): ApprovalCommentEdit {
		const node = this.snapshot(value, comment);
		if (!this.nullableText(node.lastEditedAt) || !this.actor(node.editor))
			throw new Error("Invalid approval editor response");
		return {
			id: node.id,
			body: node.body,
			lastEditedAt: node.lastEditedAt,
			editor: node.editor,
		};
	}

	history(value: unknown, comment: ApprovalComment): ApprovalHistoryPage {
		const node = this.snapshot(value, comment);
		const history = node.userContentEdits;
		if (
			!this.collaborators.approvalSchema.object(history) ||
			!Array.isArray(history.nodes) ||
			!history.nodes.every(this.historyEdit.bind(this)) ||
			!this.collaborators.approvalSchema.object(history.pageInfo) ||
			typeof history.pageInfo.hasNextPage !== "boolean" ||
			!this.nullableText(history.pageInfo.endCursor)
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

	private snapshot(
		value: unknown,
		comment: ApprovalComment,
	): Record<string, unknown> & { id: string; body: string } {
		if (
			!this.collaborators.approvalSchema.object(value) ||
			!this.collaborators.approvalSchema.object(value.node) ||
			typeof value.node.id !== "string" ||
			typeof value.node.body !== "string" ||
			value.node.id !== comment.node_id ||
			value.node.body !== comment.body
		)
			throw new Error("Approval comment changed during verification");
		return { ...value.node, id: value.node.id, body: value.node.body };
	}

	private comment(value: unknown): value is ApprovalComment {
		return (
			this.collaborators.approvalSchema.object(value) &&
			this.collaborators.approvalSchema.count(value.id) &&
			value.id > 0 &&
			(value.node_id === undefined || typeof value.node_id === "string") &&
			(value.body === undefined || this.nullableText(value.body)) &&
			(value.user === undefined ||
				value.user === null ||
				(this.collaborators.approvalSchema.object(value.user) &&
					typeof value.user.login === "string"))
		);
	}

	private historyEdit(value: unknown): value is ApprovalContentEdit {
		return (
			this.collaborators.approvalSchema.object(value) &&
			this.nullableText(value.diff) &&
			this.nullableText(value.deletedAt) &&
			this.actor(value.editor)
		);
	}

	private actor(value: unknown): value is ApprovalCommentEdit["editor"] {
		return (
			value === null ||
			(this.collaborators.approvalSchema.object(value) &&
				typeof value.login === "string" &&
				typeof value.__typename === "string")
		);
	}

	private nullableText(value: unknown): value is string | null {
		return value === null || typeof value === "string";
	}
}
