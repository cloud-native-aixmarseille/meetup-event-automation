import {
	MailBatchFingerprint,
	PlanCommunications,
	type CommunicationClock,
	type MailRecipient,
	type ReconcileCommunications,
	type ReconcileCommunicationsInput,
} from "@meetup-automation/communication";
import type { OrganizerApproval } from "../ports/organizer-approval.js";
import type { CommunicationJourneyDiagnostic } from "../communication/contracts.js";

/** Approve the whole event batch so partial delivery resumes under the same decision. */
export class ApproveCommunicationBatch {
	constructor(
		private readonly approvals: OrganizerApproval,
		private readonly clock: CommunicationClock,
		private readonly preview: Pick<ReconcileCommunications, "execute">,
	) {}
	async execute(
		input: ReconcileCommunicationsInput,
		recipients: readonly MailRecipient[],
		diagnostics: CommunicationJourneyDiagnostic[],
	): Promise<boolean> {
		try {
			const now = this.clock.now();
			const planner = new PlanCommunications();
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
				kind:
					input.occurrenceStatus === "held"
						? "email-thanks"
						: "email-introduction",
				revision: MailBatchFingerprint.create(
					input.eventDate,
					input.timeZone,
					mails,
				),
				eventDate: input.eventDate,
				recipientCount: mails.length,
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
