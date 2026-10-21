import type { OrganizerApprovalRequest } from "@meetup-automation/journey";
import { vi } from "vitest";
import { ApprovalPresenter } from "../src/approval-presenter.js";
import { ApprovalRecord } from "../src/approval-record.js";
import {
	type ApprovalComment,
	type ApprovalCommentEdit,
	type ApprovalContentEdit,
	GithubApprovalClient,
} from "../src/github-approval-client.js";
import { GithubOrganizerApproval } from "../src/github-organizer-approval.js";
import { ApprovalMessages } from "../src/i18n/approval-messages.js";
export const request = {
	kind: "email-introduction",
	revision: "a".repeat(64),
	eventDate: "2099-06-08",
	recipientCount: 2,
	requestedAt: "2099-06-01T10:00:00.000Z",
} satisfies OrganizerApprovalRequest;
export function fixture(locale = "en") {
	const comments: ApprovalComment[] = [];
	const edits = new Map<string, ApprovalCommentEdit>();
	const history = new Map<string, ApprovalContentEdit[]>();
	const presenter = new ApprovalPresenter(new ApprovalMessages(locale));
	const graphql = vi.fn().mockImplementation(async (_query, variables) => ({
		node: edits.has(variables.id)
			? {
					...edits.get(variables.id),
					userContentEdits: {
						nodes: history.get(variables.id) ?? [],
						pageInfo: { hasNextPage: false, endCursor: null },
					},
				}
			: null,
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
		history.set(`comment-${input.comment_id}`, [
			{
				diff: input.body,
				deletedAt: null,
				editor: { login: "automation", __typename: "Bot" },
			},
			...(history.get(`comment-${input.comment_id}`) ?? []),
		]);
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
		edits.set(`comment-${id}`, {
			id: `comment-${id}`,
			body: input.body,
			editor: null,
			lastEditedAt: null,
		});
		history.set(`comment-${id}`, [
			{
				diff: input.body,
				deletedAt: null,
				editor: { login: "automation", __typename: "Bot" },
			},
		]);
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
	const dispatch = vi.fn().mockResolvedValue({
		outcome: "accepted",
		message: { destination: "C12345", messageId: "100.001" },
	});
	const react = vi.fn().mockResolvedValue(true);
	const approvals = new GithubOrganizerApproval(
		client,
		"automation[bot]",
		presenter,
		{ send: dispatch, react },
		"organizer-channel",
	);
	return {
		api,
		presenter,
		graphql,
		edits,
		history,
		react,
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
	f.history.set(comment.node_id, [
		{ diff: edit.body, deletedAt: null, editor: edit.editor },
		...(f.history.get(comment.node_id) ?? []),
	]);
}

export const publicationRequest = {
	kind: "meetup-publication",
	revision: "b".repeat(64),
	eventDate: "2099-06-08",
	requestedAt: request.requestedAt,
	publication: {
		url: "https://www.meetup.com/example/events/12345/",
		title: "Cloud Native Evening",
		startTime: "18:45",
		endTime: "20:45",
		timeZone: "Europe/Paris",
		venue: { name: "Public Venue", city: "Marseille" },
	},
} satisfies OrganizerApprovalRequest;
