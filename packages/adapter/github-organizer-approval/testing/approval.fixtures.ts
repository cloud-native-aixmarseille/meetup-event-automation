import type { OrganizerApprovalRequest } from "@meetup-automation/journey";
import { vi } from "vitest";
import { ApprovalPresenter } from "../src/approval-presenter.js";
import { ApprovalRecord } from "../src/approval-record.js";
import {
	type ApprovalComment,
	type ApprovalCommentEdit,
	GithubApprovalClient,
} from "../src/github-approval-client.js";
import { GithubOrganizerApproval } from "../src/github-organizer-approval.js";
import { ApprovalMessages } from "../src/i18n/approval-messages.js";
export const request: OrganizerApprovalRequest = {
	kind: "email-introduction",
	revision: "a".repeat(64),
	eventDate: "2099-06-08",
	recipientCount: 2,
	requestedAt: "2099-06-01T10:00:00.000Z",
};
export function fixture(locale = "en") {
	const comments: ApprovalComment[] = [];
	const edits = new Map<string, ApprovalCommentEdit>();
	const presenter = new ApprovalPresenter(new ApprovalMessages(locale));
	const graphql = vi.fn().mockImplementation(async (_query, variables) => ({
		node: edits.get(variables.id) ?? null,
	}));
	const permission = vi
		.fn()
		.mockResolvedValue({ data: { permission: "write" } });
	const update = vi.fn(async (input: { comment_id: number; body: string }) => {
		const index = comments.findIndex(
			(comment) => comment.id === input.comment_id,
		);
		if (index < 0) throw new Error("Missing synthetic comment");
		comments[index] = {
			...comments[index],
			id: input.comment_id,
			node_id: `comment-${input.comment_id}`,
			body: input.body,
		};
		edits.set(`comment-${input.comment_id}`, {
			id: `comment-${input.comment_id}`,
			body: input.body,
			editor: { login: "automation[bot]", __typename: "Bot" },
			lastEditedAt: request.requestedAt,
		});
	});
	const create = vi.fn(async (input: { body: string }) => {
		const id = comments.length + 100;
		comments.push({
			id,
			node_id: `comment-${id}`,
			body: input.body,
			user: { login: "automation[bot]", type: "Bot" },
		});
		return { data: { id } };
	});
	const list = vi.fn(async () => ({ data: [...comments], headers: {} }));
	const api = {
		graphql,
		rest: {
			issues: {
				listComments: list,
				createComment: create,
				updateComment: update,
			},
			repos: { getCollaboratorPermissionLevel: permission },
		},
	};
	const client = new GithubApprovalClient(api, "example", "meetups", 42);
	const dispatch = vi.fn().mockResolvedValue({ outcome: "accepted" });
	const approvals = new GithubOrganizerApproval(
		client,
		"automation[bot]",
		presenter,
		{ dispatch },
		"organizer-channel",
	);
	return {
		presenter,
		graphql,
		edits,
		comments,
		permission,
		update,
		create,
		list,
		client,
		dispatch,
		approvals,
	};
}
export function decision(
	f: ReturnType<typeof fixture>,
	overrides: Partial<ApprovalCommentEdit> = {},
	status: "approved" | "rejected" | "pending" = "approved",
) {
	const comment = f.comments[0];
	if (!comment?.node_id) throw new Error("Missing synthetic approval");
	const record = ApprovalRecord.read(comment.body ?? "");
	const edit: ApprovalCommentEdit = {
		id: comment.node_id,
		body: f.presenter.issue(record, { status }),
		editor: { login: "organizer", __typename: "User" },
		lastEditedAt: request.requestedAt,
		...overrides,
	};
	f.comments[0] = { ...comment, body: edit.body };
	f.edits.set(comment.node_id, edit);
}
