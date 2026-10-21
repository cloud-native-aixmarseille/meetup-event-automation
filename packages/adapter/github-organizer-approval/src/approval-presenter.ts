import type { ApprovalDecision, StoredApproval } from "./approval-state.js";
import type {
	EmailApprovalPresenter,
	EmailApprovalPresenterArguments,
} from "./email-approval-presenter.js";
import type { ApprovalMessages } from "./i18n/approval-messages.js";
import type {
	MeetupApprovalPresenter,
	MeetupApprovalPresenterArguments,
} from "./meetup-approval-presenter.js";

/** Renders issue comments through the presenter for their approval kind. */
export interface ApprovalPresenterCollaborators {
	readonly createEmailApprovalPresenter: (
		...args: EmailApprovalPresenterArguments
	) => EmailApprovalPresenter;
	readonly createMeetupApprovalPresenter: (
		...args: MeetupApprovalPresenterArguments
	) => MeetupApprovalPresenter;
}

export class ApprovalPresenter {
	private readonly email: EmailApprovalPresenter;
	private readonly meetup: MeetupApprovalPresenter;
	constructor(
		private readonly collaborators: ApprovalPresenterCollaborators,
		messages: ApprovalMessages,
	) {
		this.email = this.collaborators.createEmailApprovalPresenter(messages);
		this.meetup = this.collaborators.createMeetupApprovalPresenter(messages);
	}
	issue(record: StoredApproval, decision: ApprovalDecision): string {
		return record.kind === "meetup-publication"
			? this.meetup.issue(record, decision)
			: this.email.issue(record, decision);
	}
}
export type ApprovalPresenterArguments =
	ConstructorParameters<typeof ApprovalPresenter> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
