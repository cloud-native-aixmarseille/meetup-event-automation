import type { NotificationGateway } from "@meetup-automation/communication";
import type {
	OrganizerApproval,
	OrganizerApprovalRequest,
	OrganizerApprovalResult,
} from "@meetup-automation/journey";
import type { ApprovalPresenter } from "./approval-presenter.js";
import {
	APPROVAL_MARKER,
	ApprovalRecord,
	type StoredApproval,
} from "./approval-record.js";
import type { GithubApprovalClient } from "./github-approval-client.js";
import { ResolveApprovalDecision } from "./resolve-approval-decision.js";

/** GitHub is authoritative; Slack points organizers to the durable issue request. */
export class GithubOrganizerApproval implements OrganizerApproval {
	constructor(
		private readonly client: GithubApprovalClient,
		private readonly authorLogin: string,
		private readonly presenter: ApprovalPresenter,
		private readonly notifications: NotificationGateway,
		private readonly organizerChannelId: string,
	) {}
	async request(
		input: OrganizerApprovalRequest,
	): Promise<OrganizerApprovalResult> {
		ApprovalRecord.validate(input);
		const comments = await this.client.list();
		const records = comments
			.filter(
				(comment) =>
					comment.user?.login.toLowerCase() ===
						this.authorLogin.toLowerCase() &&
					comment.body?.startsWith(APPROVAL_MARKER),
			)
			.map((comment) => ({
				comment,
				record: ApprovalRecord.read(comment.body ?? ""),
			}))
			.filter(({ record }) => record.kind === input.kind);
		if (records.length > 1) throw new Error("Ambiguous approval state");
		const existing = records[0];
		const current =
			existing && ApprovalRecord.matches(existing.record, input)
				? existing
				: undefined;
		const record = current?.record ?? ApprovalRecord.create(input);
		const decision = current
			? await new ResolveApprovalDecision(this.client, this.presenter).execute(
					record,
					current.comment,
				)
			: { status: "pending" as const };
		// Preserve the human edit: bot rewrites would replace GitHub's editor identity.
		if (decision.status !== "pending")
			return { status: decision.status, notificationFailed: false };
		const body = this.presenter.issue(record, decision);
		const commentId = existing
			? existing.comment.id
			: await this.client.create(body);
		if (existing && body !== existing.comment.body)
			await this.client.replace(commentId, existing.comment.body ?? "", body);
		await this.notify(record, commentId);
		return {
			status: decision.status,
			notificationFailed:
				record.notification === "reserved" || record.notification === "retry",
		};
	}
	private async notify(
		record: StoredApproval,
		commentId: number,
	): Promise<void> {
		if (record.notification !== "new" && record.notification !== "retry")
			return;
		const before = this.presenter.issue(record, { status: "pending" });
		record.notification = "reserved";
		const reserved = this.presenter.issue(record, { status: "pending" });
		await this.client.replace(commentId, before, reserved);
		let outcome: "accepted" | "uncertain" | "rejected" | "deferred" =
			"uncertain";
		try {
			const result = await this.notifications.dispatch({
				channel: "notification",
				kind: "readiness-reminder",
				intentId: record.requestId,
				idempotencyKey: record.requestId,
				repositoryId: "organizer-approval",
				eventId: record.requestId,
				policyVersion: "1",
				recipientId: "organizers",
				recipient: {
					channel: "notification",
					role: "organizers",
					recipientId: "organizers",
					receivesCommunications: true,
					destination: this.organizerChannelId,
				},
				content: this.presenter.slack(record, this.client.url(commentId)),
			});
			outcome = result.outcome;
		} catch {
			/* Ambiguous acknowledgement must not produce duplicate notifications. */
		}
		record.notification =
			outcome === "accepted"
				? "sent"
				: outcome === "uncertain"
					? "reserved"
					: "retry";
		await this.client.replace(
			commentId,
			reserved,
			this.presenter.issue(record, { status: "pending" }),
		);
	}
}
