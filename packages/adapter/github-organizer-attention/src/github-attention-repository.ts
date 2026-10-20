import type {
	AttentionRepository,
	AttentionState,
} from "@meetup-automation/communication";
import { DIAGNOSTIC_MARKER } from "./attention-diagnostic-checklist.js";
import type { AttentionPresenter } from "./attention-presenter.js";
import { ATTENTION_MARKER, AttentionRecord } from "./attention-record.js";
import type { GithubAttentionClient } from "./github-attention-client.js";
import { TrustedAttentionState } from "./trusted-attention-state.js";

type Snapshot = { id: number; body: string };
export class GithubAttentionRepository implements AttentionRepository {
	private snapshot?: Snapshot;
	private obsolete?: Snapshot;
	private previous?: AttentionState;
	private loaded = false;
	constructor(
		private readonly client: GithubAttentionClient,
		private readonly author: string,
		private readonly presenter: AttentionPresenter,
	) {}
	async load(): Promise<AttentionState | undefined> {
		const trusted = new TrustedAttentionState(this.client, this.author);
		const records: {
			snapshot: Snapshot;
			state: AttentionState;
			diagnostic: boolean;
		}[] = [];
		let diagnostic: Snapshot | undefined;
		for (const comment of await this.client.list()) {
			if (
				comment.user?.type !== "Bot" ||
				comment.user.login.toLowerCase() !== this.author.toLowerCase()
			)
				continue;
			const body = await trusted.body(comment);
			const snapshot = { id: comment.id, body: comment.body ?? "" };
			if (body.startsWith(DIAGNOSTIC_MARKER) && !diagnostic) {
				diagnostic = snapshot;
				this.presenter.setDiagnosticComment(comment.id, body);
			}
			if (body.includes(ATTENTION_MARKER))
				records.push({
					snapshot,
					state: AttentionRecord.read(body),
					diagnostic: body.startsWith(DIAGNOSTIC_MARKER),
				});
		}
		this.select(records, diagnostic);
		this.loaded = true;
		return this.previous;
	}
	private select(
		records: {
			snapshot: Snapshot;
			state: AttentionState;
			diagnostic: boolean;
		}[],
		diagnostic?: Snapshot,
	): void {
		const canonical = records.find((item) => item.diagnostic) ?? records[0];
		if (
			records.length > 1 &&
			(records.length !== 2 ||
				!canonical?.diagnostic ||
				records.every((item) => item.diagnostic) ||
				records.some(
					(item) =>
						JSON.stringify(item.state) !== JSON.stringify(canonical.state),
				))
		)
			throw new Error("Multiple attention records");
		this.snapshot = diagnostic ?? canonical?.snapshot;
		this.previous = canonical?.state;
		this.obsolete = records.find(
			(item) => item.snapshot.id !== this.snapshot?.id,
		)?.snapshot;
	}
	async save(state: AttentionState): Promise<void> {
		if (!this.loaded)
			throw new Error("Attention state must be loaded before writing");
		await this.consolidate();
		const body = this.presenter.issue(state);
		if (body.length > 60000) throw new Error("Attention record limit exceeded");
		if (this.snapshot) {
			if (this.snapshot.body === body) return;
			await this.client.replace(this.snapshot.id, this.snapshot.body, body);
		} else {
			if (
				(await this.client.list()).some(
					(comment) =>
						comment.user?.login.toLowerCase() === this.author.toLowerCase() &&
						(comment.body?.includes(ATTENTION_MARKER) ||
							comment.body?.startsWith(DIAGNOSTIC_MARKER)),
				)
			)
				throw new Error("Attention state changed before creation");
			const id = await this.client.create(body);
			this.snapshot = { id, body };
		}
		this.snapshot.body = body;
	}
	private async consolidate(): Promise<void> {
		if (!this.obsolete || !this.snapshot || !this.previous) return;
		// Persist the exact reservation before retiring its source. A retry can
		// recognize identical records after interruption between these writes.
		const body = this.presenter.issue(this.previous);
		if (body.length > 60000) throw new Error("Attention record limit exceeded");
		await this.client.replace(this.snapshot.id, this.snapshot.body, body);
		this.snapshot.body = body;
		await this.client.remove(this.obsolete.id, this.obsolete.body);
		this.obsolete = undefined;
	}
	async retire(commentId: number): Promise<void> {
		if (!this.loaded)
			throw new Error("Attention state must be loaded before retiring");
		if (!this.snapshot) return;
		await this.consolidate();
		await this.client.replace(
			this.snapshot.id,
			this.snapshot.body,
			this.presenter.retired(commentId),
		);
		this.snapshot = undefined;
	}
}
