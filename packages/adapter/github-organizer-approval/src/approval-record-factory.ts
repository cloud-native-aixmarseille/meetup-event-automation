import {
	ApprovalRequestPolicy,
	type OrganizerApprovalRequest,
	type OrganizerFollowUpInput,
} from "@meetup-automation/journey";
import { ApprovalRequestSchema } from "./approval-request-schema.js";
import type { StoredApproval } from "./approval-state.js";
import { StoredApprovalSchema } from "./stored-approval-schema.js";

/** Allocate a new storage identity; reads and encoding never generate one. */
export class ApprovalRecordFactory {
	constructor(private readonly nextIdentity: () => string) {}

	create(request: OrganizerApprovalRequest): StoredApproval {
		ApprovalRequestSchema.validate(request);
		ApprovalRequestPolicy.validate(request);
		return this.allocate(request);
	}

	placeholder(input: OrganizerFollowUpInput): StoredApproval {
		return this.allocate({
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
	}

	private allocate(
		request: OrganizerApprovalRequest & Pick<StoredApproval, "followUp">,
	): StoredApproval {
		const record = {
			...request,
			requestId: `approval-${this.nextIdentity()}`,
			notification: "new" as const,
		};
		StoredApprovalSchema.validate(record);
		return record;
	}
}
