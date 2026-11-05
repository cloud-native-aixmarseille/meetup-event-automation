import { isDeepStrictEqual } from "node:util";
import {
	AUTOMATION_STATE_MARKER,
	type AutomationStateCodec,
} from "./automation-state-codec.js";
import type {
	StateCommentClient,
	StateCommentEdit,
} from "./state-comment-client.js";

/** Maintainers may recover publication journals without changing approval or delivery authority. */
export class StateEditAuthority {
	constructor(
		private readonly client: Pick<StateCommentClient, "canApprove">,
		private readonly codec: Pick<AutomationStateCodec, "scope" | "read">,
		private readonly author: string,
	) {}
	async verify(
		current: StateCommentEdit,
		history: Awaited<ReturnType<StateCommentClient["history"]>>,
	): Promise<void> {
		if (
			!this.bot(current.editor) &&
			(history[0]?.diff !== current.body ||
				!(await this.authorized(current.editor)))
		)
			throw new Error("Automation state was edited outside automation");
		let confirmedByBot = this.bot(current.editor);
		for (const [index, edit] of history.entries()) {
			if (this.bot(edit.editor)) {
				confirmedByBot = true;
				continue;
			}
			if (
				edit.editor?.__typename !== "User" ||
				(!confirmedByBot && !(await this.authorized(edit.editor))) ||
				!this.publicationChange(history[index + 1]?.diff, edit.diff)
			)
				throw new Error("Automation state was edited outside automation");
		}
	}
	private bot(editor: StateCommentEdit["editor"]): boolean {
		return (
			editor?.__typename === "Bot" &&
			editor.login.toLowerCase().replace(/\[bot\]$/, "") ===
				this.author.toLowerCase().replace(/\[bot\]$/, "")
		);
	}
	private async authorized(
		editor: StateCommentEdit["editor"],
	): Promise<boolean> {
		return (
			editor?.__typename === "User" &&
			(await this.client.canApprove(editor.login))
		);
	}
	private publicationChange(
		before: string | null | undefined,
		after: string | null,
	): boolean {
		if (!before || !after) return false;
		const scope = this.codec.scope(before);
		if (scope === "meetup" || scope === "community")
			return this.codec.scope(after) === scope;
		if (
			!before.startsWith(AUTOMATION_STATE_MARKER) ||
			!after.startsWith(AUTOMATION_STATE_MARKER)
		)
			return false;
		const previous = this.codec.read(before);
		const next = this.codec.read(after);
		return (
			isDeepStrictEqual(previous.records.content, next.records.content) &&
			isDeepStrictEqual(previous.records.social, next.records.social) &&
			isDeepStrictEqual(previous.imports, next.imports)
		);
	}
}
