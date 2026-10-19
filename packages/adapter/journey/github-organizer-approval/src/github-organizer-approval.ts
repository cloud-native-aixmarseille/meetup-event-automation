import type {
	ApprovalRequestPolicy,
	FollowUpApprovalPolicy,
	OrganizerApproval,
	OrganizerApprovalRequest,
	OrganizerApprovalResult,
} from "@meetup-automation/journey";
import type { ApprovalDetailsPreview } from "./approval-details-preview.js";
import type { ApprovalNotifications } from "./approval-notifications.js";
import type { ApprovalRecordFactory } from "./approval-record-factory.js";
import type { ApprovalRequestSchema } from "./approval-request-schema.js";
import type { FinalizeApprovalDecision } from "./finalize-approval-decision.js";
import type { GithubApprovalClient } from "./github-approval-client.js";
import type { GithubApprovalRepository } from "./github-approval-repository.js";

/** Reuse reviewed requests and recheck authorization before returning approval. */
export interface GithubOrganizerApprovalCollaborators {
	readonly followUpApprovalPolicy: Pick<FollowUpApprovalPolicy, "initialFor">;
	readonly approvalRequestSchema: Pick<ApprovalRequestSchema, "validate">;
	readonly approvalRequestPolicy: Pick<
		ApprovalRequestPolicy,
		"validate" | "matches"
	>;
	readonly approvalDetailsPreview: Pick<ApprovalDetailsPreview, "create">;
}

export class GithubOrganizerApproval implements OrganizerApproval {
	constructor(
		private readonly collaborators: GithubOrganizerApprovalCollaborators,
		private readonly repository: GithubApprovalRepository,
		private readonly records: ApprovalRecordFactory,
		private readonly finalizer: FinalizeApprovalDecision,
		private readonly notifications: ApprovalNotifications,
		private readonly permissions: Pick<GithubApprovalClient, "canApprove">,
	) {}
	async request(
		input: OrganizerApprovalRequest,
	): Promise<OrganizerApprovalResult> {
		input = this.reviewedRequest(input);
		this.collaborators.approvalRequestSchema.validate(input);
		this.collaborators.approvalRequestPolicy.validate(input);
		const existing = (await this.repository.states()).find(
			({ record }) =>
				record.kind === input.kind &&
				(input.kind !== "content-review" ||
					record.content?.key === input.content.key),
		);
		if (
			existing &&
			this.collaborators.approvalRequestPolicy.matches(
				existing.record,
				input,
				existing.record.decision?.status ?? "pending",
			)
		) {
			const result = await this.finalizer.execute(existing);
			if (
				(result.status === "approved" ||
					result.status === "iteration-requested") &&
				!(await this.permissions.canApprove(
					existing.record.decision?.actor ?? "",
				))
			)
				throw new Error(
					"The recorded organizer no longer has approval permission",
				);
			if (result.status !== "pending") return result;
			return {
				status: "pending",
				notificationFailed: await this.notifications.send(
					existing.record,
					existing.comment.id,
				),
			};
		}
		const record = this.records.create(input);
		const followUp = this.collaborators.followUpApprovalPolicy.initialFor(
			input,
			existing?.record.followUp,
		);
		if (followUp)
			record.followUp = { ...existing?.record.followUp, ...followUp };

		const state = await this.repository.save(record, existing);
		return {
			status: "pending",
			notificationFailed: await this.notifications.send(
				record,
				state.comment.id,
			),
		};
	}
	async synchronize(): Promise<{ notificationFailed: boolean }> {
		let notificationFailed = false;
		for (const state of await this.repository.activeStates()) {
			const result = await this.finalizer.execute(state);
			notificationFailed = result.notificationFailed || notificationFailed;
		}
		return { notificationFailed };
	}

	private reviewedRequest(
		input: OrganizerApprovalRequest,
	): OrganizerApprovalRequest {
		if (input.kind === "meetup-publication" || !input.details) return input;
		return {
			...input,
			details: this.collaborators.approvalDetailsPreview.create(input.details),
		};
	}
}
export type GithubOrganizerApprovalArguments =
	ConstructorParameters<typeof GithubOrganizerApproval> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
