import type {
	OrganizerReadinessContext,
	OrganizerReadinessNotification,
} from "@meetup-automation/journey";
import type { OrganizerNotificationMessages } from "./organizer-notification-messages.js";
import {
	READINESS_GUIDANCE,
	type ReadinessGuidanceId,
} from "./readiness-guidance.js";

export class OrganizerReadinessPresenter
	implements OrganizerReadinessNotification
{
	constructor(private readonly messages: OrganizerNotificationMessages) {}

	render(context: OrganizerReadinessContext): string {
		const reasons = new Set(
			context.reasons.map((reason) => this.reason(reason)),
		);
		if (reasons.size === 0)
			reasons.add(this.messages.t("communication.reason.unknown"));
		const repository = context.repository
			.split("/")
			.map(encodeURIComponent)
			.join("/");
		return this.messages.t("communication.organizer-attention", {
			issue: context.issueNumber,
			date: /^\d{4}-\d{2}-\d{2}$/.test(context.eventDate)
				? context.eventDate
				: this.messages.t("communication.date-unknown"),
			url: `https://github.com/${repository}/issues/${context.issueNumber}`,
			reasons: [...reasons].map((reason) => `• ${reason}`).join("\n"),
		});
	}

	private reason(reason: OrganizerReadinessContext["reasons"][number]): string {
		let key: ReadinessGuidanceId | undefined = READINESS_GUIDANCE.get(
			reason.code,
		);
		if (reason.code === "event.logistics.intent.invalid") {
			key =
				reason.field === "Aperitif"
					? "communication.reason.aperitif"
					: reason.field === "Restaurant / Bar"
						? "communication.reason.restaurant"
						: "communication.reason.logistics";
		}
		if (!key && reason.code.startsWith("event.document."))
			key = "communication.reason.issue-format";
		if (!key && reason.code.startsWith("referential."))
			key = "communication.reason.referentials";
		return this.messages.t(key ?? "communication.reason.unknown");
	}
}
