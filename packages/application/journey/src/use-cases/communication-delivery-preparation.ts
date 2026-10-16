import type { NotificationRecipient } from "@meetup-automation/communication";
import type { MeetupEvent } from "@meetup-automation/event";
import {
	type ReferentialCatalog,
	ValidateReferentialCatalog,
} from "@meetup-automation/referential";
import type {
	CommunicationJourneyDiagnostic,
	ManageMeetupCommunicationsInput,
} from "../communication/contracts.js";
import { CommunicationRecipients } from "./communication-recipients.js";
import { SpeakerFeedbackPreparation } from "./speaker-feedback-preparation.js";
import {
	type ManageMeetupCommunicationsDependencies,
	UNRESOLVED_MAIL_RECIPIENTS,
} from "./manage-meetup-communications-contracts.js";

export class CommunicationDeliveryPreparation {
	constructor(
		private readonly dependencies: Pick<
			ManageMeetupCommunicationsDependencies,
			"config" | "referentialRepository" | "feedbackResults"
		>,
	) {}
	async execute(
		input: ManageMeetupCommunicationsInput,
		event: MeetupEvent,
		runtimeDiagnostics: CommunicationJourneyDiagnostic[],
	) {
		const catalog = await this.catalog(runtimeDiagnostics);
		const organizerNotificationDestination =
			input.organizerNotificationDestination.trim();
		const notificationConfigured =
			this.dependencies.config.communication["slack-enabled"];

		if (event.proposalStatus === "stale")
			runtimeDiagnostics.push({
				code: "communication.event-references-unresolved",
				severity: "error",
			});
		const mailRecipientResolution =
			catalog && event.proposalStatus !== "stale"
				? CommunicationRecipients.resolveMailRecipients(
						event,
						catalog,
						runtimeDiagnostics,
					)
				: UNRESOLVED_MAIL_RECIPIENTS;
		const referencesResolved =
			catalog !== undefined && mailRecipientResolution.resolved;
		const recipients = referencesResolved
			? await new SpeakerFeedbackPreparation(
					this.dependencies.feedbackResults,
				).execute(event, mailRecipientResolution.recipients, runtimeDiagnostics)
			: mailRecipientResolution.recipients;
		const notificationRecipients: readonly NotificationRecipient[] = [
			{
				channel: "notification",
				role: "organizers",
				recipientId: "organizers-slack",
				receivesCommunications: notificationConfigured,
				destination: organizerNotificationDestination,
			},
		];

		return {
			notificationConfigured,
			mailRecipientResolution: { ...mailRecipientResolution, recipients },
			referencesResolved,
			notificationRecipients,
		};
	}
	private async catalog(runtimeDiagnostics: CommunicationJourneyDiagnostic[]) {
		const validation = await new ValidateReferentialCatalog(
			this.dependencies.referentialRepository,
		).execute();
		let catalog: ReferentialCatalog | undefined;
		if (validation.isValid) {
			catalog = validation.catalog;
		} else {
			runtimeDiagnostics.push({
				code: "communication.referential-catalog-invalid",
				severity: "error",
			});
		}

		return catalog;
	}
}
