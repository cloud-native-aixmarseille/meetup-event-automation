import type { ApprovalNotificationRequest } from "@meetup-automation/journey";
import type {
	SlackApprovalMessages,
	SlackApprovalMessagesArguments,
} from "./i18n/slack-approval-messages.js";

export interface SlackApprovalPresenterCollaborators {
	readonly createSlackApprovalMessages: (
		...args: SlackApprovalMessagesArguments
	) => SlackApprovalMessages;
}

export class SlackApprovalPresenter {
	private readonly messages: SlackApprovalMessages;
	constructor(
		private readonly collaborators: SlackApprovalPresenterCollaborators,
		locale: string | undefined,
	) {
		this.messages = this.collaborators.createSlackApprovalMessages(locale);
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
export type SlackApprovalPresenterArguments =
	ConstructorParameters<typeof SlackApprovalPresenter> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
