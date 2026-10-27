import { vi } from "vitest";
import type {
	SocialJournalComment,
	SocialJournalCommentClient,
	SocialJournalCommentEdit,
} from "../src/social-journal-comment-client.js";
type SocialJournalHistoryEntry = Awaited<
	ReturnType<SocialJournalCommentClient["history"]>
>[number];
import { TrustedSocialJournalComments } from "../src/trusted-social-journal-comments.js";

export function journalClientFixture() {
	const comments: SocialJournalComment[] = [];
	const edits = new Map<number, SocialJournalCommentEdit>();
	const histories = new Map<number, SocialJournalHistoryEntry[]>();
	const bot = { login: "automation", __typename: "Bot" };
	const client: SocialJournalCommentClient = {
		list: vi.fn(async () => [...comments]),
		create: vi.fn(async (body) => {
			const id = comments.length + 1;
			comments.push({
				id,
				node_id: `comment-${id}`,
				body,
				user: { login: "automation[bot]", type: "Bot" },
			});
			edits.set(id, {
				id: `comment-${id}`,
				body,
				lastEditedAt: null,
				editor: null,
			});
			histories.set(id, []);
			return id;
		}),
		replace: vi.fn(async (id, before, body) => {
			const index = comments.findIndex((comment) => comment.id === id);
			if (comments[index]?.body !== before)
				throw new Error("Comment changed before persistence");
			comments[index] = { ...comments[index], body };
			edits.set(id, {
				id: `comment-${id}`,
				body,
				lastEditedAt: "2026-10-20T12:00:00Z",
				editor: bot,
			});
			histories.get(id)?.push({
				diff: before,
				deletedAt: null,
				editor: bot,
			});
		}),
		edit: vi.fn(async (comment) => {
			const edit = edits.get(comment.id);
			if (!edit) throw new Error("Missing synthetic editor");
			return edit;
		}),
		history: vi.fn(async (comment) => histories.get(comment.id) ?? []),
	};
	const trusted = new TrustedSocialJournalComments(client, "automation[bot]");
	return { comments, edits, histories, client, trusted };
}
