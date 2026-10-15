import type {
	AttentionRepository,
	AttentionState,
} from "@meetup-automation/communication";
import { ATTENTION_MARKER, AttentionRecord } from "./attention-record.js";
import type { AttentionPresenter } from "./attention-presenter.js";
import type { GithubAttentionClient } from "./github-attention-client.js";
import { TrustedAttentionState } from "./trusted-attention-state.js";
export class GithubAttentionRepository implements AttentionRepository {
	private snapshot?: { id: number; body: string };
	private loaded = false;
	constructor(
		private readonly client: GithubAttentionClient,
		private readonly author: string,
		private readonly presenter: AttentionPresenter,
	) {}
	async load(): Promise<AttentionState | undefined> {
		const trusted = new TrustedAttentionState(this.client, this.author);
		let state: AttentionState | undefined;
		const comments = await this.client.list();
		this.presenter.setDiagnosticComments(
			comments
				.filter(
					(comment) =>
						comment.user?.type === "Bot" &&
						comment.user.login.toLowerCase() === this.author.toLowerCase() &&
						/^<!-- meetup-automation:(?:event|communication)-diagnostics:v1 -->/.test(
							comment.body ?? "",
						),
				)
				.map((comment) => comment.id),
		);
		for (const comment of comments) {
			if (
				comment.user?.type !== "Bot" ||
				comment.user.login.toLowerCase() !== this.author.toLowerCase()
			)
				continue;
			const body = await trusted.body(comment);
			if (!body.startsWith(ATTENTION_MARKER)) continue;
			if (state) throw new Error("Multiple attention records");
			state = AttentionRecord.read(body);
			this.snapshot = { id: comment.id, body: comment.body ?? "" };
		}
		this.loaded = true;
		return state;
	}
	async save(state: AttentionState): Promise<void> {
		if (!this.loaded)
			throw new Error("Attention state must be loaded before writing");
		const body = this.presenter.issue(state);
		if (body.length > 60000) throw new Error("Attention record limit exceeded");
		if (this.snapshot) {
			if (this.snapshot.body === body) return;
			await this.client.replace(this.snapshot.id, this.snapshot.body, body);
		} else {
			// Under the issue lock, still refuse a newly introduced competing record.
			if (
				(await this.client.list()).some(
					(comment) =>
						comment.user?.login.toLowerCase() === this.author.toLowerCase() &&
						comment.body?.startsWith(ATTENTION_MARKER),
				)
			)
				throw new Error("Attention state changed before creation");
			const id = await this.client.create(body);
			this.snapshot = { id, body };
		}
		this.snapshot.body = body;
	}
}
