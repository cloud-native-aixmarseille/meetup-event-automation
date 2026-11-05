import type { AutomationStateCodec } from "./automation-state-codec.js";
import type { StateEditAuthority } from "./state-edit-authority.js";
import type {
	StateComment,
	StateCommentClient,
	StateCommentEdit,
} from "./state-comment-client.js";

/** Verify bot authorship and edit history before importing or reading state. */
export class TrustedStateComments {
	constructor(
		private readonly client: Pick<
			StateCommentClient,
			"list" | "edit" | "history"
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
		for (const comment of await this.client.list()) {
			if (
				comment.user?.type !== "Bot" ||
				comment.user.login.toLowerCase() !== this.author.toLowerCase()
			)
				continue;
			const current = await this.client.edit(comment);
			if (current.id !== comment.node_id || current.body !== comment.body)
				throw new Error("Automation state changed during verification");
			const managed = this.codec.managed(current.body);
			if (current.lastEditedAt !== null || current.editor !== null)
				await this.verifyHistory(comment, current, managed);
			if (managed) records.push(comment);
		}
		return records;
	}
	private async verifyHistory(
		comment: StateComment,
		current: StateCommentEdit,
		managed: boolean,
	): Promise<void> {
		const history = await this.client.history(comment);
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
