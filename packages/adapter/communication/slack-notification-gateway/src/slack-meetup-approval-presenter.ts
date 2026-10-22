import type { SlackApprovalMessages } from "./i18n/slack-approval-messages.js";
import type { SlackApprovalRequests } from "./slack-approval-presenter.js";

export class SlackMeetupApprovalPresenter {
	constructor(private readonly messages: Pick<SlackApprovalMessages, "t">) {}
	render(request: SlackApprovalRequests["meetup-publication"]): string {
		return this.messages.t("request.publication", {
			date: request.eventDate,
			url: request.approvalUrl,
		});
	}
}
