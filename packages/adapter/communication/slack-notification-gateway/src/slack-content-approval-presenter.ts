import type { SlackApprovalMessages } from "./i18n/slack-approval-messages.js";
import type { SlackApprovalRequests } from "./slack-approval-presenter.js";

export class SlackContentApprovalPresenter {
	constructor(private readonly messages: Pick<SlackApprovalMessages, "t">) {}
	render(request: SlackApprovalRequests["content-review"]): string {
		return this.messages.t("request.content", {
			date: request.eventDate,
			target: request.target,
			url: request.approvalUrl,
		});
	}
}
