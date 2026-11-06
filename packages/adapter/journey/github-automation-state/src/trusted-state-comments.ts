import type { AutomationStateCodec } from "./automation-state-codec.js";
import type { StateEditAuthority } from "./state-edit-authority.js";
import type {
	StateComment,
	StateCommentClient,
	StateCommentEdit,
	StateContentEdit,
} from "./state-comment-client.js";

/** Verify bot authorship and edit history before importing or reading state. */
export class TrustedStateComments {
	constructor(
		private readonly client: Pick<
			StateCommentClient,
			"list" | "edits" | "histories"
		>,
		private readonly codec: Pick<AutomationStateCodec, "managed">,
		private readonly author: string,
		private readonly authority: Pick<StateEditAuthority, "verify">,
	) {
		if (!/^[a-z\d-]+\[bot\]$/i.test(author))
			throw new Error("Automation state requires a trusted GitHub App bot");
	}
	async list(): Promise<readonly StateComment[]> {
		const records: StateComment[] = [];
		const comments = (await this.client.list()).filter(
			(comment) =>
				comment.user?.type === "Bot" &&
				comment.user.login.toLowerCase() === this.author.toLowerCase(),
		);
		const edits = await this.client.edits(comments);
		if (edits.length !== comments.length)
			throw new Error("Automation state editors are unavailable");
		const edited = comments.filter((_, index) => this.edited(edits[index]));
		const histories = await this.client.histories(edited);
		if (histories.length !== edited.length)
			throw new Error("Automation state history is unavailable");
		let historyIndex = 0;
		for (const [index, comment] of comments.entries()) {
			const current = edits[index];
			if (current.id !== comment.node_id || current.body !== comment.body)
				throw new Error("Automation state changed during verification");
			const managed = this.codec.managed(current.body);
			if (this.edited(current)) {
				await this.verifyHistory(histories[historyIndex], current, managed);
				historyIndex += 1;
			}
			if (managed) records.push(comment);
		}
		return records;
	}
	private edited(current: StateCommentEdit): boolean {
		return current.lastEditedAt !== null || current.editor !== null;
	}
	private async verifyHistory(
		history: readonly StateContentEdit[],
		current: StateCommentEdit,
		managed: boolean,
	): Promise<void> {
		if (
			!current.editor ||
			history.length === 0 ||
			history.some((edit) => edit.deletedAt || edit.diff === null)
		)
			throw new Error("Automation state history is unavailable");
		const previouslyManaged = history.some(
			(edit) => edit.diff !== null && this.codec.managed(edit.diff),
		);
		if (!managed && !previouslyManaged) return;
		if (!managed)
			throw new Error("Automation state was edited outside automation");
		await this.authority.verify(current, history);
	}
}
