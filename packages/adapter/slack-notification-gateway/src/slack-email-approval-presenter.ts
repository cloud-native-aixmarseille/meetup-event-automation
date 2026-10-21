import type { SlackApprovalMessages } from "./i18n/slack-approval-messages.js";
import type { SlackApprovalRequests } from "./slack-approval-presenter.js";

export class SlackEmailApprovalPresenter {
	constructor(private readonly messages: Pick<SlackApprovalMessages, "t">) {}
	render(request: SlackApprovalRequests["email-introduction"]): string {
		return this.messages.t("request.introduction", {
			date: request.eventDate,
			url: request.approvalUrl,
			count: request.recipientCount,
		});
	}
}
