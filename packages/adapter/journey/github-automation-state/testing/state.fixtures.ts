import { StateEditAuthority } from "../src/state-edit-authority.js";
import { TrustedStateComments } from "../src/trusted-state-comments.js";
import { vi } from "vitest";
import { AutomationStateCodec } from "../src/automation-state-codec.js";
import { GithubAutomationStateComposition } from "../src/dependency-composition.js";
import type {
	StateComment,
	StateCommentEdit,
	StateContentEdit,
} from "../src/state-comment-client.js";

export function automationStateFixture(
	initial: readonly StateComment[] = [],
	author = "automation[bot]",
) {
	const comments: StateComment[] = initial.map((comment) => ({
		...comment,
		node_id: comment.node_id ?? `comment-${comment.id}`,
		user: comment.user
			? {
					...comment.user,
					type: comment.user.login.endsWith("[bot]") ? "Bot" : "User",
				}
			: null,
	}));
	const edits = new Map<number, StateCommentEdit>();
	const histories = new Map<number, readonly StateContentEdit[]>();
	const minimized = new Set<number>();
	const bot = { login: author, __typename: "Bot" };
	const client = {
		canApprove: vi.fn(async (_username: string) => true),
		list: vi.fn(async () => [...comments]),
		create: vi.fn(async (body: string) => {
			const id = Math.max(0, ...comments.map((comment) => comment.id)) + 1;
			comments.push({
				id,
				node_id: `comment-${id}`,
				body,
				user: { login: author, type: "Bot" },
			});
			histories.set(id, [{ diff: body, deletedAt: null, editor: bot }]);
			return id;
		}),
		replace: vi.fn(async (id: number, before: string, body: string) => {
			const index = comments.findIndex((comment) => comment.id === id);
			if (comments[index]?.body !== before)
				throw new Error("Comment changed before persistence");
			if (before === body) return;
			comments[index] = { ...comments[index], body };
			edits.set(id, {
				id: `comment-${id}`,
				body,
				editor: bot,
				lastEditedAt: "2026-01-01T12:00:00Z",
			});
			histories.set(id, [
				{ diff: body, deletedAt: null, editor: bot },
				...(histories.get(id) ?? [
					{ diff: before, deletedAt: null, editor: bot },
				]),
			]);
		}),
		edits: vi.fn(async (batch: readonly StateComment[]) =>
			batch.map(
				(comment) =>
					edits.get(comment.id) ?? {
						id: comment.node_id ?? "",
						body: comment.body ?? "",
						editor: null,
						lastEditedAt: null,
					},
			),
		),
		histories: vi.fn(async (batch: readonly StateComment[]) =>
			batch.map((comment) => histories.get(comment.id) ?? []),
		),
	};
	const visibility = {
		synchronize: vi.fn(async (id: number, body: string, resolved: boolean) => {
			if (comments.find((comment) => comment.id === id)?.body !== body)
				throw new Error("Comment changed before visibility update");
			if (resolved) minimized.add(id);
			else minimized.delete(id);
		}),
	};
	const codec = new AutomationStateCodec();
	const state = new GithubAutomationStateComposition().create(
		client,
		author,
		"en",
		visibility,
	);
	const authority = new StateEditAuthority(client, codec, author);
	const trusted = new TrustedStateComments(client, codec, author, authority);
	return {
		authority,
		trusted,
		state,
		codec,
		client,
		comments,
		edits,
		histories,
		minimized,
		visibility,
	};
}
