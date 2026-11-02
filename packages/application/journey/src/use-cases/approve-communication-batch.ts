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

/** Review preparation mail separately by recipient role; preserve full-group revisions on retries. */
export interface ApproveCommunicationBatchCollaborators {
	readonly mailBatchFingerprint: Pick<MailBatchFingerprint, "create">;
	readonly communicationApprovalDetails: Pick<
		CommunicationApprovalDetails,
		"create"
	>;
	readonly planner: Pick<PlanCommunications, "execute">;
	readonly parameters: import("../approval/email-review-parameters.js").EmailReviewParameterPolicy;
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
	): Promise<readonly ReconcileCommunicationsInput[]> {
		const plan = this.collaborators.planner.execute({
			...input,
			now: this.clock.now(),
		});
		if (!plan.intents.length) return [input];
		if (plan.intents.some((mail) => mail.kind.endsWith("-thanks")))
			return [await this.approve(input, recipients, event, diagnostics)];
		const groups: ReconcileCommunicationsInput[] = [];
		for (const role of ["hosting", "speaker"] as const) {
			const mailRecipients = input.mailRecipients.filter(
				(recipient) => recipient.role === role,
			);
			if (mailRecipients.length)
				groups.push(
					await this.approve(
						{ ...input, mailRecipients },
						recipients.filter((recipient) => recipient.role === role),
						event,
						diagnostics,
					),
				);
		}
		return groups;
	}
	private async approve(
		input: ReconcileCommunicationsInput,
		recipients: readonly MailRecipient[],
		event: MeetupEvent,
		diagnostics: CommunicationJourneyDiagnostic[],
	): Promise<ReconcileCommunicationsInput> {
		try {
			const now = this.clock.now();
			const { planner } = this.collaborators;
			const pending = planner.execute({ ...input, now });
			if (!pending.intents.some(({ channel }) => channel === "mail"))
				return input;
			const preview = await this.preview.execute({ ...input, mode: "check" });
			if (preview.diagnostics.some(({ severity }) => severity === "error"))
				throw new Error("Communication approval preflight failed");
			if (preview.counts.due === 0) return input;
			if (!input.mailPlaceholders?.eventSlidesUrl) {
				diagnostics.push({
					code: "communication.slides-unavailable",
					severity: "error",
				});
				return input;
			}
			const request = this.request(input, recipients, event, now);
			const parameters = request.details.parameters;
			const result = await this.approvals.request(request);
			this.diagnostics(result, diagnostics);
			if (result.status !== "approved") return input;
			if (result.emailParameters) {
				if (!parameters) throw new Error("Unexpected email parameter override");
				this.collaborators.parameters.validateEdit(
					parameters,
					result.emailParameters,
				);
			}
			return {
				...input,
				dispatchAuthorized: true,
				mailPlaceholders: {
					...input.mailPlaceholders,
					...result.emailParameters,
				},
			};
		} catch {
			diagnostics.push({
				code: "communication.approval-unavailable",
				severity: "error",
			});
			return input;
		}
	}
	private diagnostics(
		result: import("../ports/organizer-approval.js").OrganizerApprovalResult,
		diagnostics: CommunicationJourneyDiagnostic[],
	): void {
		if (result.notificationFailed)
			diagnostics.push({
				code: "communication.approval-notification-failed",
				severity: "warning",
			});
		if (result.status !== "approved")
			diagnostics.push({
				code: result.invalidEmailParameters
					? "communication.email-parameters-invalid"
					: result.status === "rejected"
						? "communication.approval-rejected"
						: "communication.approval-pending",
				severity: "warning",
			});
	}

	private request(
		input: ReconcileCommunicationsInput,
		recipients: readonly MailRecipient[],
		event: MeetupEvent,
		now: Date,
	) {
		const batch = this.collaborators.planner.execute({
			...input,
			now,
			mailRecipients: recipients,
		});
		if (batch.diagnostics.some(({ severity }) => severity === "error"))
			throw new Error("Communication approval batch is invalid");
		const mails = batch.intents.filter((intent) => intent.channel === "mail");
		const details = this.collaborators.communicationApprovalDetails.create(
			event,
			mails,
		);
		const introduction = mails[0]?.kind;
		const parameters = introduction?.endsWith("-introduction")
			? this.collaborators.parameters.project(input.mailPlaceholders ?? {})
			: undefined;
		return {
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
			details: {
				...details,
				...(introduction === "host-introduction" ||
				introduction === "speaker-introduction"
					? { mailKind: introduction, parameters }
					: {}),
			},
			requestedAt: now.toISOString(),
		} satisfies import("../ports/organizer-approval.js").OrganizerApprovalRequest;
	}
}
export type ApproveCommunicationBatchArguments =
	ConstructorParameters<typeof ApproveCommunicationBatch> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
