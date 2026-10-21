import type { ApprovalNotificationRequest } from "@meetup-automation/journey";
import { SlackApprovalMessages } from "./i18n/slack-approval-messages.js";

export class SlackApprovalPresenter {
	private readonly messages: SlackApprovalMessages;
	constructor(locale: string | undefined) {
		this.messages = new SlackApprovalMessages(locale);
	}
	render(request: ApprovalNotificationRequest): string {
		const details = {
			date: request.eventDate,
			url: request.approvalUrl,
		};
		return request.kind === "meetup-publication"
			? this.messages.t("request.publication", details)
			: this.messages.t("request.introduction", {
					...details,
					count: request.recipientCount,
				});
	}
}
