import { isDeepStrictEqual } from "node:util";
import type {
	AutomationStateRepository,
	AutomationStateScope,
} from "@meetup-automation/journey";
import {
	AUTOMATION_STATE_MARKER,
	type AutomationStateCodec,
	type StoredAutomationState,
} from "./automation-state-codec.js";
import type {
	StateComment,
	StateCommentClient,
} from "./state-comment-client.js";
import type { TrustedStateComments } from "./trusted-state-comments.js";

interface StateSnapshot {
	readonly state: StoredAutomationState;
	readonly anchor: StateComment | undefined;
	readonly sources: readonly StateComment[];
}

/** One authoritative state comment, updated under the workflow's issue lock. */
export class GithubAutomationState implements AutomationStateRepository {
	constructor(
		private readonly client: Pick<StateCommentClient, "create" | "replace">,
		private readonly comments: Pick<TrustedStateComments, "list">,
		private readonly codec: AutomationStateCodec,
		private readonly presenter: {
			render(state: StoredAutomationState): string;
		},
		private readonly visibility: {
			synchronize(id: number, body: string, resolved: boolean): Promise<void>;
		},
	) {}
	async read(scope: AutomationStateScope): Promise<readonly string[]> {
		return (await this.snapshot()).state.records[scope];
	}
	async write(
		scope: AutomationStateScope,
		previous: readonly string[],
		next: readonly string[],
	): Promise<void> {
		const snapshot = await this.snapshot();
		if (!isDeepStrictEqual(snapshot.state.records[scope], previous))
			throw new Error("Automation state changed before persistence");
		await this.persist(snapshot, {
			...snapshot.state,
			records: { ...snapshot.state.records, [scope]: next },
		});
	}
	async reconcile(): Promise<void> {
		const snapshot = await this.snapshot();
		if (snapshot.anchor || snapshot.sources.length)
			await this.persist(snapshot, snapshot.state);
	}
	private async snapshot(): Promise<StateSnapshot> {
		const comments = await this.comments.list();
		const anchors = comments.filter((comment) =>
			comment.body?.startsWith(AUTOMATION_STATE_MARKER),
		);
		if (anchors.length > 1)
			throw new Error("Duplicate automation state comments");
		const anchor = anchors[0];
		const sources = comments.filter(
			(comment) => this.codec.scope(comment.body ?? "") !== undefined,
		);
		if (anchor) {
			const state = this.codec.read(anchor.body ?? "");
			for (const source of sources) {
				const imported = state.imports.find((entry) => entry.id === source.id);
				if (
					!imported ||
					imported.digest !== this.codec.digest(source.body ?? "")
				)
					throw new Error(
						"Internal state changed outside the consolidated comment",
					);
			}
			return { state, anchor, sources };
		}
		const state = this.codec.empty();
		for (const source of sources) {
			const body = source.body ?? "";
			const scope = this.codec.scope(body);
			if (scope) state.records[scope] = [...state.records[scope], body];
		}
		return {
			state: {
				...state,
				imports: sources.map((source) => ({
					id: source.id,
					digest: this.codec.digest(source.body ?? ""),
				})),
			},
			anchor,
			sources,
		};
	}
	private async persist(
		snapshot: StateSnapshot,
		state: StoredAutomationState,
	): Promise<void> {
		const body = this.presenter.render(state);
		if (body.length > 60000)
			throw new Error(
				"Consolidated automation state exceeds the comment size limit",
			);
		const anchor = snapshot.anchor ?? snapshot.sources[0];
		const id = anchor ? anchor.id : await this.client.create(body);
		if (anchor) await this.client.replace(id, anchor.body ?? "", body);
		const saved = await this.snapshot();
		if (saved.anchor?.id !== id || saved.anchor.body !== body)
			throw new Error("Automation state persistence readback is uncertain");
		await this.visibility.synchronize(id, body, true);
		for (const source of saved.sources)
			await this.visibility.synchronize(source.id, source.body ?? "", true);
	}
}
