import type { ApprovalDecision, StoredApproval } from "./approval-record.js";
import { ApprovalMessages } from "./i18n/approval-messages.js";
import { CATALOGS } from "./i18n/catalog.js";
import { EmailApprovalPresenter } from "./email-approval-presenter.js";
import { MeetupApprovalPresenter } from "./meetup-approval-presenter.js";

/** Renders issue comments through the presenter for their approval kind. */
export class ApprovalPresenter {
	private readonly email: EmailApprovalPresenter;
	private readonly meetup: MeetupApprovalPresenter;
	constructor(messages: ApprovalMessages) {
		this.email = new EmailApprovalPresenter(messages);
		this.meetup = new MeetupApprovalPresenter(messages);
	}
	issue(record: StoredApproval, decision: ApprovalDecision): string {
		return record.kind === "meetup-publication"
			? this.meetup.issue(record, decision)
			: this.email.issue(record, decision);
	}
	static supportedLocales(): readonly ApprovalPresenter[] {
		return Object.keys(CATALOGS).map(
			(locale) => new ApprovalPresenter(new ApprovalMessages(locale)),
		);
	}
}
