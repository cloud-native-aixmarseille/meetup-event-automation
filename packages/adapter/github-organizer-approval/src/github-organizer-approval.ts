import type {
	OrganizerApproval,
	OrganizerApprovalNotification,
	OrganizerApprovalRequest,
	OrganizerApprovalResult,
} from "@meetup-automation/journey";
import { ApprovalNotifications } from "./approval-notifications.js";
import type { ApprovalPresenter } from "./approval-presenter.js";
import { ApprovalRecord, type StoredApproval } from "./approval-record.js";
import type {
	ApprovalComment,
	GithubApprovalClient,
} from "./github-approval-client.js";
import { ResolveApprovalDecision } from "./resolve-approval-decision.js";
import { TrustedApprovalState } from "./trusted-approval-state.js";

interface ApprovalState {
	readonly comment: ApprovalComment;
	readonly record: StoredApproval;
}

/** Final decisions are bot-persisted revisions of the original request comment. */
export class GithubOrganizerApproval implements OrganizerApproval {
	private readonly notifications: ApprovalNotifications;
	constructor(
		private readonly client: GithubApprovalClient,
		private readonly authorLogin: string,
		private readonly presenter: ApprovalPresenter,
		notifications: OrganizerApprovalNotification,
		organizerChannelId: string,
	) {
		this.notifications = new ApprovalNotifications(
			client,
			presenter,
			notifications,
			organizerChannelId,
		);
	}
	async request(
		input: OrganizerApprovalRequest,
	): Promise<OrganizerApprovalResult> {
		ApprovalRecord.validate(input);
		const existing = (await this.states()).find(
			({ record }) => record.kind === input.kind,
		);
		if (existing && ApprovalRecord.matches(existing.record, input)) {
			const result = await this.finalize(existing);
			if (
				result.status === "approved" &&
				!(await this.client.canApprove(existing.record.decision?.actor ?? ""))
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
		const record = ApprovalRecord.create(input);
		const body = this.presenter.issue(record, { status: "pending" });
		const commentId = existing
			? existing.comment.id
			: await this.client.create(body);
		if (existing)
			await this.client.replace(commentId, existing.comment.body ?? "", body);
		return {
			status: "pending",
			notificationFailed: await this.notifications.send(record, commentId),
		};
	}
	async synchronize(): Promise<{ notificationFailed: boolean }> {
		let notificationFailed = false;
		for (const state of await this.states()) {
			const result = await this.finalize(state);
			notificationFailed = result.notificationFailed || notificationFailed;
		}
		return { notificationFailed };
	}
	private async states(): Promise<readonly ApprovalState[]> {
		const states: ApprovalState[] = [];
		const trusted = new TrustedApprovalState(this.client, this.authorLogin);
		for (const comment of await this.client.list()) {
			if (comment.user?.login.toLowerCase() !== this.authorLogin.toLowerCase())
				continue;
			const record = await trusted.read(comment);
			if (!record) continue;
			if (states.some((state) => state.record.kind === record.kind))
				throw new Error("Ambiguous approval state");
			states.push({ record, comment });
		}
		return states;
	}
	private async finalize({
		record,
		comment,
	}: ApprovalState): Promise<OrganizerApprovalResult> {
		const decision = await new ResolveApprovalDecision(
			this.client,
			this.presenter,
		).execute(record, comment);
		if (decision.status !== "pending" && !record.decision) {
			if (!decision.actor || !decision.decidedAt)
				throw new Error("Missing verified approval identity");
			record.decision = {
				status: decision.status,
				actor: decision.actor,
				decidedAt: decision.decidedAt,
			};
		}
		const body = this.presenter.issue(record, decision);
		if (body !== comment.body)
			await this.client.replace(comment.id, comment.body ?? "", body);
		return {
			status: decision.status,
			notificationFailed: await this.notifications.react(record, comment.id),
		};
	}
}
