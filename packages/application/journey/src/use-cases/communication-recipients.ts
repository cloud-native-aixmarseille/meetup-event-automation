import type { MailRecipient } from "@meetup-automation/communication";
import type {
	ReferentialCatalog,
	ResolveEventReferences,
	Speaker,
} from "@meetup-automation/referential";
import type { CommunicationJourneyDiagnostic } from "../communication/contracts.js";
import {
	type MailRecipientResolution,
	UNRESOLVED_MAIL_RECIPIENTS,
} from "./manage-meetup-communications-contracts.js";

export interface CommunicationRecipientsCollaborators {
	readonly resolveEventReferences: Pick<ResolveEventReferences, "execute">;
}

export class CommunicationRecipients {
	constructor(
		private readonly collaborators: CommunicationRecipientsCollaborators,
	) {}

	resolveMailRecipients(
		event: {
			readonly host?: { readonly id?: string; readonly displayName: string };
			readonly agenda: readonly {
				readonly speakers: readonly {
					readonly id?: string;
					readonly displayName: string;
				}[];
			}[];
		},
		catalog: ReferentialCatalog,
		diagnostics: CommunicationJourneyDiagnostic[],
	): MailRecipientResolution {
		const resolution = this.collaborators.resolveEventReferences.execute(
			catalog,
			{
				hostReference: event.host ? this.renderReference(event.host) : "",
				speakerReferences: event.agenda.flatMap((entry) =>
					entry.speakers.map(this.renderReference.bind(this)),
				),
			},
		);
		if (!resolution.resolved) {
			diagnostics.push({
				code: "communication.event-references-unresolved",
				severity: "error",
			});
			return UNRESOLVED_MAIL_RECIPIENTS;
		}

		const eventHost = resolution.host;
		const primaryContact = eventHost.contacts[0];
		const hostingAddress = primaryContact?.address ?? "";
		const recipients: MailRecipient[] = primaryContact
			? [
					{
						channel: "mail",
						role: "hosting",
						recipientId: primaryContact.id,
						receivesCommunications: true,
						email: primaryContact.email,
						placeholders: { hostingName: eventHost.displayName },
					},
				]
			: [];

		for (const speaker of resolution.speakers) {
			recipients.push(
				this.speakerRecipient(speaker, eventHost.displayName, hostingAddress),
			);
		}

		return { resolved: true, recipients: Object.freeze(recipients) };
	}

	speakerRecipient(
		speaker: Speaker,
		hostingName: string,
		hostingAddress: string,
	): MailRecipient {
		return {
			channel: "mail",
			role: "speaker",
			recipientId: speaker.id,
			receivesCommunications: true,
			email: speaker.email,
			placeholders: {
				speakerName: speaker.sourceIdentity
					? speaker.displayName
					: speaker.firstName || speaker.displayName,
				hostingName,
				hostingAddress,
			},
		};
	}

	renderReference(reference: {
		readonly id?: string;
		readonly displayName: string;
	}): string {
		return reference.id
			? `${reference.displayName} [${reference.id}]`
			: reference.displayName;
	}
}
