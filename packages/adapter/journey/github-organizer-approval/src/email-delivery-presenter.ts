import type { EmailDeliverySummary } from "@meetup-automation/journey";
import type { ApprovalMessages } from "./i18n/approval-messages.js";

export class EmailDeliveryPresenter {
	constructor(private readonly messages: ApprovalMessages) {}

	render(delivery: readonly EmailDeliverySummary[]): string {
		return [
			...delivery.map((item) =>
				this.messages.t("approval.delivery.status", {
					kind: item.kind.replaceAll("-", "_"),
					status: item.status.replaceAll("-", "_"),
					count: item.count,
				}),
			),
			this.messages.t("approval.delivery.notice", {}),
		].join("\n\n");
	}
}
