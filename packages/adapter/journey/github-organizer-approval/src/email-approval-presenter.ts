import type { ApprovalRequestPolicy } from "@meetup-automation/journey";
import type { ApprovalDetailsPresenter } from "./approval-details-presenter.js";
import type { ApprovalDecision, StoredApproval } from "./approval-state.js";
import type { FollowUpPresenter } from "./follow-up-presenter.js";
import type { ApprovalMessages } from "./i18n/approval-messages.js";

export interface EmailApprovalPresenterCollaborators {
	readonly approvalRequestPolicy: Pick<ApprovalRequestPolicy, "reviewPhase">;
	readonly followUpPresenter: Pick<FollowUpPresenter, "render">;
	readonly approvalDetailsPresenter: Pick<ApprovalDetailsPresenter, "render">;
	readonly deliveryPresenter: import("./email-delivery-presenter.js").EmailDeliveryPresenter;
}

export class EmailApprovalPresenter {
	constructor(
		private readonly collaborators: EmailApprovalPresenterCollaborators,
		private readonly messages: ApprovalMessages,
	) {}
	issue(
		record: Extract<
			StoredApproval,
			{ kind: "email-introduction" | "email-thanks" }
		>,
		decision: ApprovalDecision,
	): string {
		const heading = [...this.collaborators.followUpPresenter.render(record)];
		const phase = this.collaborators.approvalRequestPolicy.reviewPhase({
			recipientCount: record.recipientCount,
			followUpActive: record.followUp?.active,
			decided: record.decision !== undefined,
		});
		if (phase === "inactive")
			return [...heading, record.followUp?.attentionDetails ?? ""]
				.join("\n\n")
				.trimEnd();
		const details = record.details
			? [
					this.collaborators.approvalDetailsPresenter.render({
						...record.details,
						...((record.decision?.emailParameters ?? record.emailDraft)
							? {
									parameters:
										record.decision?.emailParameters ?? record.emailDraft,
								}
							: {}),
					}),
				]
			: [];
		if (record.delivery)
			details.unshift(
				this.collaborators.deliveryPresenter.render(record.delivery),
			);
		if (record.followUp?.attentionDetails)
			details.push(record.followUp.attentionDetails);
		if (record.decision)
			return [
				...heading,
				this.messages.t("approval.final", {
					kind:
						record.details?.mailKind?.replaceAll("-", "_") ??
						record.kind.replace("email-", ""),
					date: record.eventDate,
					count: record.recipientCount,
					status: record.decision.status,
					actor: record.decision.actor,
					decidedAt: record.decision.decidedAt,
				}),
				...details,
			].join("\n\n");
		return [
			...heading,
			this.messages.t("approval.request", {
				kind:
					record.details?.mailKind?.replaceAll("-", "_") ??
					record.kind.replace("email-", ""),
				date: record.eventDate,
				count: record.recipientCount,
				approveMark: decision.status === "approved" ? "x" : " ",
				rejectMark: decision.status === "rejected" ? "x" : " ",
			}),
			...details,
		].join("\n\n");
	}
}
export type EmailApprovalPresenterArguments =
	ConstructorParameters<typeof EmailApprovalPresenter> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
