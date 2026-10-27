import type { ApprovalPresenter } from "./approval-presenter.js";
import type { ApprovalState, StoredApproval } from "./approval-state.js";
import type { GithubApprovalClient } from "./github-approval-client.js";
import type { StoredApprovalSchema } from "./stored-approval-schema.js";
import type { TrustedApprovalState } from "./trusted-approval-state.js";

/** Persist trusted requests per independent approval scope with checked writes. */
export interface GithubApprovalRepositoryCollaborators {
	readonly approvalRequestPolicy: Pick<ApprovalRequestPolicy, "scope">;
	readonly storedApprovalSchema: Pick<StoredApprovalSchema, "validate">;
}

export class GithubApprovalRepository {
	constructor(
		private readonly collaborators: GithubApprovalRepositoryCollaborators,
		private readonly client: GithubApprovalClient,
		private readonly trusted: TrustedApprovalState,
		private readonly authorLogin: string,
		private readonly presenter: ApprovalPresenter,
	) {}
	async states(): Promise<readonly ApprovalState[]> {
		const states: ApprovalState[] = [];
		for (const comment of await this.client.list()) {
			if (comment.user?.login.toLowerCase() !== this.authorLogin.toLowerCase())
				continue;
			const record = await this.trusted.read(comment);
			if (!record) continue;
			if (
				states.some(
					(state) =>
						this.collaborators.approvalRequestPolicy.scope(state.record) ===
						this.collaborators.approvalRequestPolicy.scope(record),
				)
			)
				throw new Error("Ambiguous approval state");
			states.push({ record, comment });
		}
		return states;
	}
	async activeStates(): Promise<readonly ApprovalState[]> {
		const active = new Map<string, ApprovalState>();
		for (const state of await this.states()) {
			const record = state.record;
			const key =
				record.kind === "content-review"
					? `content:${record.content.target}`
					: this.collaborators.approvalRequestPolicy.scope(record);
			active.set(key, state);
		}
		return [...active.values()];
	}
	async save(
		record: StoredApproval,
		existing?: ApprovalState,
	): Promise<ApprovalState> {
		this.collaborators.storedApprovalSchema.validate(record);
		const body = this.presenter.issue(
			record,
			record.decision ?? { status: "pending" },
		);
		if (!existing) {
			const id = await this.client.create(body);
			return { record, comment: { id, body } };
		}
		await this.client.replace(
			existing.comment.id,
			existing.comment.body ?? "",
			body,
		);
		existing.comment = { ...existing.comment, body };
		return { record, comment: existing.comment };
	}
}
export type GithubApprovalRepositoryArguments =
	ConstructorParameters<typeof GithubApprovalRepository> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
import type { ApprovalRequestPolicy } from "@meetup-automation/journey";
