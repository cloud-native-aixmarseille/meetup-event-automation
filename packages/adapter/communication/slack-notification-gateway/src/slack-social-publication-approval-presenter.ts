import type { SlackApprovalMessages } from "./i18n/slack-approval-messages.js";
import type { SlackApprovalRequests } from "./slack-approval-presenter.js";

export class SlackSocialPublicationApprovalPresenter {
	constructor(private readonly messages: Pick<SlackApprovalMessages, "t">) {}

	render(request: SlackApprovalRequests["social-publication"]): string {
		return this.messages.t("request.social-publication", {
			date: request.eventDate,
			target: request.target
				.replaceAll("&", "&amp;")
				.replaceAll("<", "&lt;")
				.replaceAll(">", "&gt;"),
			url: request.approvalUrl,
		});
	}
}
