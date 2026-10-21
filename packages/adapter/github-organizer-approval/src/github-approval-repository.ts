import type { ApprovalPresenter } from "./approval-presenter.js";
import type { ApprovalState, StoredApproval } from "./approval-state.js";
import type { GithubApprovalClient } from "./github-approval-client.js";
import type { StoredApprovalSchema } from "./stored-approval-schema.js";
import type { TrustedApprovalState } from "./trusted-approval-state.js";

/** Persist one trusted request per kind with snapshot-checked comment writes. */
export interface GithubApprovalRepositoryCollaborators {
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
			if (states.some((state) => state.record.kind === record.kind))
				throw new Error("Ambiguous approval state");
			states.push({ record, comment });
		}
		return states;
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
