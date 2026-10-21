import type {
	ApprovalRequestPolicy,
	FollowUpApprovalPolicy,
	OrganizerApprovalRequest,
	OrganizerFollowUpInput,
} from "@meetup-automation/journey";
import type { ApprovalRequestSchema } from "./approval-request-schema.js";
import type { StoredApproval } from "./approval-state.js";
import type { StoredApprovalSchema } from "./stored-approval-schema.js";

/** Allocate a new storage identity; reads and encoding never generate one. */
export interface ApprovalRecordFactoryCollaborators {
	readonly followUpApprovalPolicy: Pick<FollowUpApprovalPolicy, "placeholder">;
	readonly approvalRequestSchema: Pick<ApprovalRequestSchema, "validate">;
	readonly approvalRequestPolicy: Pick<ApprovalRequestPolicy, "validate">;
	readonly storedApprovalSchema: Pick<StoredApprovalSchema, "validate">;
}

export class ApprovalRecordFactory {
	constructor(
		private readonly collaborators: ApprovalRecordFactoryCollaborators,
		private readonly nextIdentity: () => string,
	) {}

	create(request: OrganizerApprovalRequest): StoredApproval {
		this.collaborators.approvalRequestSchema.validate(request);
		this.collaborators.approvalRequestPolicy.validate(request);
		return this.allocate(request);
	}

	placeholder(input: OrganizerFollowUpInput): StoredApproval {
		return this.allocate({
			...this.collaborators.followUpApprovalPolicy.placeholder(input),
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
		this.collaborators.storedApprovalSchema.validate(record);
		return record;
	}
}
export type ApprovalRecordFactoryArguments =
	ConstructorParameters<typeof ApprovalRecordFactory> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
