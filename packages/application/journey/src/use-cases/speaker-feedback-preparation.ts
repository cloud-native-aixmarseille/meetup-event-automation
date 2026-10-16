import type { MailRecipient } from "@meetup-automation/communication";
import type { MeetupEvent } from "@meetup-automation/event";
import type { FeedbackTalkResultsGateway } from "@meetup-automation/publication";
import type { CommunicationJourneyDiagnostic } from "../communication/contracts.js";
import { CommunicationChecklist } from "./communication-checklist.js";
import { FeedbackAgendaProjection } from "./feedback-agenda-projection.js";

export class SpeakerFeedbackPreparation {
	constructor(private readonly feedback: FeedbackTalkResultsGateway) {}

	async execute(
		event: MeetupEvent,
		recipients: readonly MailRecipient[],
		diagnostics: CommunicationJourneyDiagnostic[],
		postEvent = event.occurrenceStatus === "held",
	): Promise<readonly MailRecipient[]> {
		if (
			!postEvent ||
			CommunicationChecklist.pendingRecipients(event, recipients, postEvent)
				.length === 0 ||
			!recipients.some((recipient) => recipient.role === "speaker")
		)
			return recipients;
		try {
			const agenda = FeedbackAgendaProjection.create(event, []);
			if (!agenda || !event.publicationLinks.feedback)
				throw new Error("Feedback agenda or event link is unavailable");
			const talks = await this.feedback.resolve({
				key: `${event.identity.repository.toLowerCase()}#${event.identity.issueNumber}`,
				url: event.publicationLinks.feedback,
				agenda,
			});
			return recipients.map((recipient) => {
				if (recipient.role !== "speaker") return recipient;
				const results = talks
					.filter((talk) => talk.speakerIds.includes(recipient.recipientId))
					.map(({ title, url }) => ({ title, url }));
				if (results.length === 0)
					throw new Error("Speaker feedback results are unavailable");
				return {
					...recipient,
					placeholders: {
						...recipient.placeholders,
						speakerFeedbackTalks: results,
					},
				};
			});
		} catch {
			diagnostics.push({
				code: "communication.feedback-unavailable",
				severity: "error",
			});
			return recipients;
		}
	}
}
