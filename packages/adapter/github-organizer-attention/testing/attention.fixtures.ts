import { vi } from "vitest";
import type {
	AttentionEpisode,
	AttentionState,
} from "@meetup-automation/communication";
import { AttentionPresenter } from "../src/attention-presenter.js";
import {
	GithubAttentionClient,
	type AttentionComment,
	type AttentionCommentEdit,
	type AttentionContentEdit,
} from "../src/github-attention-client.js";
import { GithubAttentionRepository } from "../src/github-attention-repository.js";
export function state(): AttentionState {
	return {
		version: 1,
		eventDate: "2099-06-08",
		stopped: false,
		episodes: [],
		post: {
			reservationId: "attention:47268:4083991200000",
			day: 47268,
			reservedAt: "2099-06-01T10:00:00Z",
			status: "pending",
		},
	};
}
export function fixture() {
	const comments: AttentionComment[] = [];
	const edits = new Map<string, AttentionCommentEdit>();
	const histories = new Map<string, AttentionContentEdit[]>();
	const presenter = new AttentionPresenter("example/meetups", 42);
	const graphql = vi
		.fn()
		.mockImplementation(async (_query: string, variables: { id: string }) => ({
			node: {
				...edits.get(variables.id),
				userContentEdits: {
					nodes: histories.get(variables.id) ?? [],
					pageInfo: { hasNextPage: false, endCursor: null },
				},
			},
		}));
	const list = vi.fn(async () => ({ data: [...comments], headers: {} }));
	const create = vi.fn(async ({ body }: { body: string }) => {
		const id = comments.length + 100;
		comments.push({
			id,
			node_id: `node-${id}`,
			body,
			user: { login: "automation[bot]", type: "Bot" },
		});
		edits.set(`node-${id}`, {
			id: `node-${id}`,
			body,
			editor: null,
			lastEditedAt: null,
		});
		return { data: { id } };
	});
	const update = vi.fn(
		async ({ comment_id: id, body }: { comment_id: number; body: string }) => {
			const index = comments.findIndex((comment) => comment.id === id);
			comments[index] = { ...comments[index], id, body };
			edits.set(`node-${id}`, {
				id: `node-${id}`,
				body,
				editor: { login: "automation", __typename: "Bot" },
				lastEditedAt: "2099-06-01T10:00:00Z",
			});
		},
	);
	const api = {
		graphql,
		rest: {
			issues: {
				listComments: list,
				createComment: create,
				updateComment: update,
			},
		},
	};
	const client = new GithubAttentionClient(api, "example", "meetups", 42);
	return {
		api,
		comments,
		edits,
		histories,
		presenter,
		client,
		graphql,
		list,
		create,
		update,
		repository: new GithubAttentionRepository(
			client,
			"automation[bot]",
			presenter,
		),
	};
}

export function episode(
	code: AttentionEpisode["condition"]["code"] = "integration-failure",
	resource = "communications",
): AttentionEpisode {
	return {
		condition: {
			key: `${code}:${resource}`,
			code,
			resource,
			owner: "communications",
			severity: "error",
			policy: "daily",
		},
		episode: 1,
		openedAt: "2099-06-01T10:00:00Z",
		status: "active",
	};
}
