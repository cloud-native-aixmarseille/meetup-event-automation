import { PostEventPolicy } from "@meetup-automation/communication";
import type { MeetupEvent } from "@meetup-automation/event";
import {
	type ReferentialCatalog,
	ValidateReferentialCatalog,
} from "@meetup-automation/referential";
import type { CommunicationJourneyDiagnostic } from "../communication/contracts.js";
import { CommunicationRecipients } from "./communication-recipients.js";
import {
	type ManageMeetupCommunicationsDependencies,
	UNRESOLVED_MAIL_RECIPIENTS,
} from "./manage-meetup-communications-contracts.js";
import { SpeakerFeedbackPreparation } from "./speaker-feedback-preparation.js";

export class CommunicationDeliveryPreparation {
	constructor(
		private readonly dependencies: Pick<
			ManageMeetupCommunicationsDependencies,
			"referentialRepository" | "feedbackResults" | "clock"
		>,
	) {}
	async execute(
		event: MeetupEvent,
		runtimeDiagnostics: CommunicationJourneyDiagnostic[],
	) {
		const postEvent = PostEventPolicy.isDue({
			eventDate: event.date,
			timeZone: event.timeZone,
			occurrenceStatus: event.occurrenceStatus ?? "unknown",
			now: this.dependencies.clock.now(),
		});
		const catalog = await this.catalog(runtimeDiagnostics);

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
				).execute(
					event,
					mailRecipientResolution.recipients,
					runtimeDiagnostics,
					postEvent,
				)
			: mailRecipientResolution.recipients;
		return {
			postEvent,
			mailRecipientResolution: { ...mailRecipientResolution, recipients },
			referencesResolved,
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
