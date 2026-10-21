import type {
	CommunicationClock,
	MailBatchFingerprint,
	MailRecipient,
	PlanCommunications,
	ReconcileCommunications,
	ReconcileCommunicationsInput,
} from "@meetup-automation/communication";
import type { MeetupEvent } from "@meetup-automation/event";
import type { CommunicationJourneyDiagnostic } from "../communication/contracts.js";
import type { OrganizerApproval } from "../ports/organizer-approval.js";
import type { CommunicationApprovalDetails } from "./communication-approval-details.js";

/** Approve the whole event batch so partial delivery resumes under the same decision. */
export interface ApproveCommunicationBatchCollaborators {
	readonly mailBatchFingerprint: Pick<MailBatchFingerprint, "create">;
	readonly communicationApprovalDetails: Pick<
		CommunicationApprovalDetails,
		"create"
	>;
	readonly planner: Pick<PlanCommunications, "execute">;
}

export class ApproveCommunicationBatch {
	constructor(
		private readonly collaborators: ApproveCommunicationBatchCollaborators,
		private readonly approvals: OrganizerApproval,
		private readonly clock: CommunicationClock,
		private readonly preview: Pick<ReconcileCommunications, "execute">,
	) {}
	async execute(
		input: ReconcileCommunicationsInput,
		recipients: readonly MailRecipient[],
		event: MeetupEvent,
		diagnostics: CommunicationJourneyDiagnostic[],
	): Promise<boolean> {
		try {
			const now = this.clock.now();
			const { planner } = this.collaborators;
			const pending = planner.execute({ ...input, now });
			if (!pending.intents.some(({ channel }) => channel === "mail"))
				return false;
			const preview = await this.preview.execute({ ...input, mode: "check" });
			if (preview.diagnostics.some(({ severity }) => severity === "error"))
				throw new Error("Communication approval preflight failed");
			if (preview.counts.due === 0) return false;
			if (!input.mailPlaceholders?.eventSlidesUrl) {
				diagnostics.push({
					code: "communication.slides-unavailable",
					severity: "error",
				});
				return false;
			}
			const batch = planner.execute({
				...input,
				now,
				mailRecipients: recipients,
			});
			if (batch.diagnostics.some(({ severity }) => severity === "error"))
				throw new Error("Communication approval batch is invalid");
			const mails = batch.intents.filter((intent) => intent.channel === "mail");
			const result = await this.approvals.request({
				kind: mails.some((mail) => mail.kind.endsWith("-thanks"))
					? "email-thanks"
					: "email-introduction",
				revision: this.collaborators.mailBatchFingerprint.create(
					input.eventDate,
					input.timeZone,
					mails,
				),
				eventDate: input.eventDate,
				recipientCount: mails.length,
				details: this.collaborators.communicationApprovalDetails.create(
					event,
					mails,
				),
				requestedAt: now.toISOString(),
			});
			if (result.notificationFailed)
				diagnostics.push({
					code: "communication.approval-notification-failed",
					severity: "warning",
				});
			if (result.status !== "approved")
				diagnostics.push({
					code:
						result.status === "rejected"
							? "communication.approval-rejected"
							: "communication.approval-pending",
					severity: "warning",
				});
			return result.status === "approved";
		} catch {
			diagnostics.push({
				code: "communication.approval-unavailable",
				severity: "error",
			});
			return false;
		}
	}
}
export type ApproveCommunicationBatchArguments =
	ConstructorParameters<typeof ApproveCommunicationBatch> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
