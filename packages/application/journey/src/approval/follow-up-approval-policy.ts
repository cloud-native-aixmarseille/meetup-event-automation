import type { OrganizerApprovalRequest } from "../ports/organizer-approval.js";
import {
	FOLLOW_UP_TASKS,
	type OrganizerFollowUpInput,
} from "../ports/organizer-follow-up.js";

export type FollowUpProgress = Pick<
	OrganizerFollowUpInput,
	"active" | "pendingTasks"
>;

/** Owns post-event progress and the non-authorizing approval placeholder. */
export class FollowUpApprovalPolicy {
	initialFor(
		request: OrganizerApprovalRequest,
		previous?: FollowUpProgress,
	): FollowUpProgress | undefined {
		return request.kind === "email-thanks"
			? (previous ?? { active: true, pendingTasks: FOLLOW_UP_TASKS })
			: undefined;
	}
	placeholder(input: OrganizerFollowUpInput): OrganizerApprovalRequest {
		return {
			kind: "email-thanks",
			revision: "0".repeat(64),
			eventDate: input.eventDate,
			recipientCount: 0,
			requestedAt: input.requestedAt,
		};
	}
	retainRequest(input: OrganizerFollowUpInput, eventDate: string): boolean {
		return !input.active || eventDate === input.eventDate;
	}
	progressState(
		progress: FollowUpProgress,
		recipientCount: number,
	): "stopped" | "waiting" | "emails-complete" | "review" {
		if (!progress.active) return "stopped";
		if (recipientCount > 0) return "review";
		return progress.pendingTasks.some(
			(task) => task === "thank-host" || task === "thank-speakers",
		)
			? "waiting"
			: "emails-complete";
	}
}
