import type { PostEventPolicy } from "@meetup-automation/communication";
import type { MeetupEvent } from "@meetup-automation/event";
import type {
	ReferentialCatalog,
	ValidateReferentialCatalog,
	ValidateReferentialCatalogArguments,
} from "@meetup-automation/referential";
import type { CommunicationJourneyDiagnostic } from "../communication/contracts.js";
import type { CommunicationRecipients } from "./communication-recipients.js";
import {
	type ManageMeetupCommunicationsDependencies,
	UNRESOLVED_MAIL_RECIPIENTS,
} from "./manage-meetup-communications-contracts.js";
import type {
	SpeakerFeedbackPreparation,
	SpeakerFeedbackPreparationArguments,
} from "./speaker-feedback-preparation.js";

export interface CommunicationDeliveryPreparationCollaborators {
	readonly postEventPolicy: Pick<PostEventPolicy, "isDue">;
	readonly communicationRecipients: Pick<
		CommunicationRecipients,
		"resolveMailRecipients"
	>;
	readonly createSpeakerFeedbackPreparation: (
		...args: SpeakerFeedbackPreparationArguments
	) => SpeakerFeedbackPreparation;
	readonly createValidateReferentialCatalog: (
		...args: ValidateReferentialCatalogArguments
	) => ValidateReferentialCatalog;
}

export class CommunicationDeliveryPreparation {
	constructor(
		private readonly collaborators: CommunicationDeliveryPreparationCollaborators,
		private readonly dependencies: Pick<
			ManageMeetupCommunicationsDependencies,
			"referentialRepository" | "feedbackResults" | "clock"
		>,
	) {}
	async execute(
		event: MeetupEvent,
		runtimeDiagnostics: CommunicationJourneyDiagnostic[],
	) {
		const postEvent = this.collaborators.postEventPolicy.isDue({
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
				? this.collaborators.communicationRecipients.resolveMailRecipients(
						event,
						catalog,
						runtimeDiagnostics,
					)
				: UNRESOLVED_MAIL_RECIPIENTS;
		const referencesResolved =
			catalog !== undefined && mailRecipientResolution.resolved;
		const recipients = referencesResolved
			? await this.collaborators
					.createSpeakerFeedbackPreparation(this.dependencies.feedbackResults)
					.execute(
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
		const validation = await this.collaborators
			.createValidateReferentialCatalog(this.dependencies.referentialRepository)
			.execute();
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
export type CommunicationDeliveryPreparationArguments =
	ConstructorParameters<typeof CommunicationDeliveryPreparation> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
