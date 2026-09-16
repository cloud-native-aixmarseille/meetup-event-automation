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
import {
	type ManageMeetupCommunicationsDependencies,
	UNRESOLVED_MAIL_RECIPIENTS,
} from "./manage-meetup-communications-contracts.js";

export class CommunicationDeliveryPreparation {
	constructor(
		private readonly dependencies: Pick<
			ManageMeetupCommunicationsDependencies,
			"config" | "referentialRepository"
		>,
	) {}
	async execute(
		input: ManageMeetupCommunicationsInput,
		dispatchPermitted: boolean,
		event: MeetupEvent,
		runtimeDiagnostics: CommunicationJourneyDiagnostic[],
	) {
		const catalog = await this.catalog(runtimeDiagnostics);
		const {
			mailGatewayEnabled,
			notificationDestination,
			notificationConfigured,
		} = this.gateways(input, dispatchPermitted, runtimeDiagnostics);

		const mailRecipientResolution = catalog
			? CommunicationRecipients.resolveMailRecipients(
					event,
					catalog,
					runtimeDiagnostics,
				)
			: UNRESOLVED_MAIL_RECIPIENTS;
		const referencesResolved =
			catalog !== undefined && mailRecipientResolution.resolved;
		const notificationRecipients: readonly NotificationRecipient[] = [
			{
				channel: "notification",
				role: "organizers",
				recipientId: "organizers-slack",
				receivesCommunications: notificationConfigured,
				destination: notificationDestination,
			},
		];

		return {
			mailGatewayEnabled,
			notificationDestination,
			notificationConfigured,
			mailRecipientResolution,
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
	private gateways(
		input: ManageMeetupCommunicationsInput,
		dispatchPermitted: boolean,
		runtimeDiagnostics: CommunicationJourneyDiagnostic[],
	) {
		const config = this.dependencies.config;

		const mailGatewayEnabled = input.mailGatewayEnabled;
		if (dispatchPermitted && !mailGatewayEnabled) {
			runtimeDiagnostics.push({
				code: "communication.mail-gateway-disabled-missing-credential",
				severity: "warning",
			});
		}

		const notificationDestination = input.notificationDestination.trim();
		const notificationConfigured = config.communication["slack-enabled"];
		if (
			dispatchPermitted &&
			notificationConfigured &&
			!input.notificationGatewayEnabled
		) {
			runtimeDiagnostics.push({
				code: "communication.notification-gateway-disabled-missing-credential",
				severity: "warning",
			});
		}
		if (
			dispatchPermitted &&
			notificationConfigured &&
			!notificationDestination
		) {
			runtimeDiagnostics.push({
				code: "communication.notification-gateway-disabled-missing-destination",
				severity: "warning",
			});
		}

		return {
			mailGatewayEnabled,
			notificationDestination,
			notificationConfigured,
		};
	}
}
