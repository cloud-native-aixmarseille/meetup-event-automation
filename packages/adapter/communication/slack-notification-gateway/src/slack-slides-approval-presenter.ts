import type { SlackApprovalMessages } from "./i18n/slack-approval-messages.js";
import type { SlackApprovalRequests } from "./slack-approval-presenter.js";

export class SlackSlidesApprovalPresenter {
	constructor(private readonly messages: Pick<SlackApprovalMessages, "t">) {}
	render(request: SlackApprovalRequests["meetup-slides"]): string {
		return this.messages.t("request.meetup-slides", {
			date: request.eventDate,
			url: request.approvalUrl,
		});
	}
}
