import type {
	AttentionApproval,
	AttentionApprovalSource,
} from "@meetup-automation/communication";
import type {
	OrganizerApproval,
	OrganizerApprovalNotification,
	OrganizerApprovalRequest,
	OrganizerApprovalResult,
	OrganizerFollowUp,
	OrganizerFollowUpInput,
} from "@meetup-automation/journey";
import { FOLLOW_UP_TASKS } from "@meetup-automation/journey";
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
	comment: ApprovalComment;
	readonly record: StoredApproval;
}

/** Final decisions are bot-persisted revisions of the original request comment. */
export class GithubOrganizerApproval
	implements OrganizerApproval, AttentionApprovalSource, OrganizerFollowUp
{
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
		if (input.kind === "email-thanks")
			record.followUp = existing?.record.followUp ?? {
				active: true,
				pendingTasks: FOLLOW_UP_TASKS,
			};
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
	async readAttention(): Promise<readonly AttentionApproval[]> {
		const result: AttentionApproval[] = [];
		for (const state of await this.states()) {
			if (state.record.recipientCount === 0) continue;
			const decision = await this.finalize(state);
			result.push({
				revision: state.record.revision,
				requestedAt: state.record.requestedAt,
				commentId: state.comment.id,
				eventDate: state.record.eventDate,
				kind: state.record.kind,
				status: decision.status,
			});
		}
		return result;
	}
	async synchronize(): Promise<{ notificationFailed: boolean }> {
		let notificationFailed = false;
		for (const state of await this.states()) {
			const result = await this.finalize(state);
			notificationFailed = result.notificationFailed || notificationFailed;
		}
		return { notificationFailed };
	}
	async synchronizeFollowUp(
		input: OrganizerFollowUpInput,
	): Promise<number | undefined> {
		const existing = (await this.states()).find(
			({ record }) => record.kind === "email-thanks",
		);
		if (!existing && !input.active) return undefined;
		if (existing) await this.finalize(existing);
		const attention = existing?.record.followUp?.attention;
		const attentionDetails = existing?.record.followUp?.attentionDetails;
		const record =
			existing &&
			(!input.active || existing.record.eventDate === input.eventDate)
				? existing.record
				: ApprovalRecord.create({
						kind: "email-thanks",
						revision: "0".repeat(64),
						eventDate: input.eventDate,
						recipientCount: 0,
						requestedAt: input.requestedAt,
						followUp: {
							active: input.active,
							pendingTasks: input.pendingTasks,
						},
					});
		record.followUp = {
			active: input.active,
			pendingTasks: input.pendingTasks,
			attention,
			attentionDetails,
		};
		ApprovalRecord.validate(record);
		const body = this.presenter.issue(
			record,
			record.decision ?? { status: "pending" },
		);
		if (!existing) return this.client.create(body);
		await this.client.replace(
			existing.comment.id,
			existing.comment.body ?? "",
			body,
		);
		return existing.comment.id;
	}
	async followUpAttention(): Promise<
		{ commentId: number; body?: string } | undefined
	> {
		const state = (await this.states()).find(({ record }) => record.followUp);
		return state
			? { commentId: state.comment.id, body: state.record.followUp?.attention }
			: undefined;
	}
	async saveFollowUpAttention(body: string, details?: string): Promise<void> {
		const state = (await this.states()).find(({ record }) => record.followUp);
		if (!state?.record.followUp)
			throw new Error("Missing post-event follow-up comment");
		await this.finalize(state);
		state.record.followUp = {
			...state.record.followUp,
			attention: body,
			attentionDetails: details,
		};
		ApprovalRecord.validate(state.record);
		const updated = this.presenter.issue(
			state.record,
			state.record.decision ?? { status: "pending" },
		);
		await this.client.replace(
			state.comment.id,
			state.comment.body ?? "",
			updated,
		);
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
	private async finalize(
		state: ApprovalState,
	): Promise<OrganizerApprovalResult> {
		const { record, comment } = state;
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
		state.comment = { ...comment, body };
		return {
			status: decision.status,
			notificationFailed: await this.notifications.react(record, comment.id),
		};
	}
}
