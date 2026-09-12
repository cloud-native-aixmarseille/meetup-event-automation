import type {
	CommunicationApprovalRepository,
	MailRecipient,
	NotificationRecipient,
	ReconcileCommunications,
	ReconcileCommunicationsResult,
} from "@meetup-automation/communication";
import {
	type EventDocument,
	type EventIdentity,
	type EventRepository,
	eventDocumentsEqual,
} from "@meetup-automation/event";
import {
	type ReferentialCatalog,
	type ReferentialRepository,
	ResolveEventReferences,
	type Speaker,
	ValidateReferentialCatalog,
} from "@meetup-automation/referential";
import type {
	CommunicationJourneyDiagnostic,
	ManageMeetupCommunicationsInput,
	ManageMeetupCommunicationsResult,
} from "../communication/contracts.js";
import { resolveCommunicationApproval } from "../communication/resolve-communication-approval.js";
import type { AutomationConfig } from "../config/automation-config.js";
import type { ManageMeetupEvent } from "./manage-meetup-event.js";

export interface ManageMeetupCommunicationsDependencies {
	readonly config: AutomationConfig;
	readonly eventRepository: EventRepository;
	readonly referentialRepository: ReferentialRepository;
	readonly manageEvent: Pick<ManageMeetupEvent, "execute">;
	readonly approvalRepository: CommunicationApprovalRepository;
	readonly actorCanApprove: (actor: string) => Promise<boolean>;
	readonly reconcileCommunications: (
		dispatchAuthorized: boolean,
	) => Pick<ReconcileCommunications, "execute">;
}

/** Coordinate event readiness, approval and delivery through owned ports. */
export class ManageMeetupCommunications {
	constructor(
		private readonly dependencies: ManageMeetupCommunicationsDependencies,
	) {}

	async execute(
		input: ManageMeetupCommunicationsInput,
	): Promise<ManageMeetupCommunicationsResult> {
		const runtimeDiagnostics: CommunicationJourneyDiagnostic[] = [];
		const config = this.dependencies.config;
		const dispatchPermitted = resolveCommunicationDispatchMode(
			input,
			config,
			runtimeDiagnostics,
		);
		const repositoryName = `${input.owner}/${input.repo}`;
		const identity = {
			repository: repositoryName,
			issueNumber: input.issueNumber,
		} as const;
		const sourceDocument =
			await this.dependencies.eventRepository.find(identity);
		if (!sourceDocument) {
			throw new Error(
				`Meetup event ${repositoryName}#${input.issueNumber} was not found`,
			);
		}
		const managed = await this.dependencies.manageEvent.execute({
			identity,
			mode: "check",
			sourceDocument,
		});

		if (managed.skipped) {
			runtimeDiagnostics.push({
				code: "communication.event-skipped",
				severity: "info",
			});
			return emptyCommunicationResult(
				dispatchPermitted ? "dispatch" : "check",
				runtimeDiagnostics,
			);
		}

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

		const mailRecipientResolution = catalog
			? resolveMailRecipients(managed.event, catalog, runtimeDiagnostics)
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

		if (
			dispatchPermitted &&
			referencesResolved &&
			!(await eventSourceIsCurrent(
				this.dependencies.eventRepository,
				identity,
				sourceDocument,
				runtimeDiagnostics,
			))
		) {
			return emptyCommunicationResult("check", runtimeDiagnostics);
		}

		const communicationApproved = referencesResolved
			? await resolveCommunicationApproval({
					input,
					config,
					repository: this.dependencies.approvalRepository,
					actorCanApprove: this.dependencies.actorCanApprove,
					captureApproval: dispatchPermitted,
					sourceDocument,
					event: managed.event,
					readiness: managed.isReady ? "ready" : "not-ready",
					notificationDestinationFingerprint:
						input.notificationDestinationFingerprint,
					diagnostics: runtimeDiagnostics,
				})
			: false;
		const dispatchEnabled =
			dispatchPermitted &&
			referencesResolved &&
			communicationApproved &&
			!runtimeDiagnostics.some(({ severity }) => severity === "error");

		if (
			dispatchEnabled &&
			!(await eventSourceIsCurrent(
				this.dependencies.eventRepository,
				identity,
				sourceDocument,
				runtimeDiagnostics,
			))
		) {
			return emptyCommunicationResult("check", runtimeDiagnostics);
		}

		const reconciliation = await this.dependencies
			.reconcileCommunications(dispatchEnabled)
			.execute({
				mode: dispatchEnabled ? "dispatch" : "check",
				dispatchCapabilities: {
					mail: mailGatewayEnabled,
					notification:
						notificationConfigured &&
						input.notificationGatewayEnabled &&
						notificationDestination.length > 0,
				},
				repositoryId: input.repositoryId?.trim() || repositoryName,
				eventId: `issue-${input.issueNumber}`,
				eventDate: managed.event.date,
				timeZone: config.timezone,
				readiness: managed.isReady ? "ready" : "not-ready",
				occurrenceStatus: managed.event.occurrenceStatus ?? "unknown",
				policyVersion: String(config.communication["policy-version"]),
				readinessWindowDays: config.communication["readiness-window-days"],
				mailRecipients: mailRecipientResolution.recipients,
				notificationRecipients,
				mailPlaceholders: eventPlaceholders(managed.event),
				notificationContent: `Meetup event issue #${input.issueNumber} requires organizer attention.`,
			});

		return withRuntimeDiagnostics(reconciliation, runtimeDiagnostics);
	}
}

export function resolveCommunicationDispatchMode(
	input: Pick<
		ManageMeetupCommunicationsInput,
		"requestedMode" | "dispatchAuthorized"
	>,
	config: AutomationConfig,
	diagnostics: CommunicationJourneyDiagnostic[],
): boolean {
	if (input.requestedMode !== "dispatch") {
		return false;
	}

	const enabledByConfig = config.communication["dispatch-enabled"];
	if (!enabledByConfig) {
		diagnostics.push({
			code: "communication.dispatch-disabled-by-config",
			severity: "warning",
		});
	}
	if (!input.dispatchAuthorized) {
		diagnostics.push({
			code: "communication.dispatch-not-authorized",
			severity: "warning",
		});
	}
	return enabledByConfig && input.dispatchAuthorized;
}

type MailRecipientResolution = Readonly<{
	resolved: boolean;
	recipients: readonly MailRecipient[];
}>;

const UNRESOLVED_MAIL_RECIPIENTS: MailRecipientResolution = Object.freeze({
	resolved: false,
	recipients: Object.freeze([]),
});

async function eventSourceIsCurrent(
	repository: EventRepository,
	identity: EventIdentity,
	expected: EventDocument,
	diagnostics: CommunicationJourneyDiagnostic[],
): Promise<boolean> {
	try {
		const current = await repository.find(identity);
		if (current && eventDocumentsEqual(current, expected)) {
			return true;
		}
	} catch {
		// A failed consistency read is indistinguishable from a stale source here.
	}
	diagnostics.push({
		code: "communication.event-concurrently-modified",
		severity: "error",
	});
	return false;
}

function resolveMailRecipients(
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
	const resolution = new ResolveEventReferences().execute(catalog, {
		hostReference: event.host ? renderReference(event.host) : "",
		speakerReferences: event.agenda.flatMap((entry) =>
			entry.speakers.map(renderReference),
		),
	});
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
			speakerRecipient(speaker, eventHost.displayName, hostingAddress),
		);
	}

	return { resolved: true, recipients: Object.freeze(recipients) };
}

function speakerRecipient(
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
			speakerName: speaker.firstName,
			hostingName,
			hostingAddress,
		},
	};
}

function renderReference(reference: {
	readonly id?: string;
	readonly displayName: string;
}): string {
	return reference.id
		? `${reference.displayName} [${reference.id}]`
		: reference.displayName;
}

function eventPlaceholders(event: {
	readonly date: string;
	readonly publicationLinks: Readonly<{
		meetup?: string;
		community?: string;
		assets?: string;
	}>;
}): Readonly<Record<string, string>> {
	return {
		eventDate: event.date,
		...(event.publicationLinks.meetup
			? { eventMeetupUrl: event.publicationLinks.meetup }
			: {}),
		...(event.publicationLinks.community
			? { eventCncfUrl: event.publicationLinks.community }
			: {}),
		...(event.publicationLinks.assets
			? { eventSlidesUrl: event.publicationLinks.assets }
			: {}),
	};
}

function withRuntimeDiagnostics(
	result: ReconcileCommunicationsResult,
	runtimeDiagnostics: readonly CommunicationJourneyDiagnostic[],
): ManageMeetupCommunicationsResult {
	return {
		...result,
		runtimeDiagnostics: Object.freeze([...runtimeDiagnostics]),
	};
}

export function emptyCommunicationResult(
	mode: "check" | "dispatch",
	runtimeDiagnostics: readonly CommunicationJourneyDiagnostic[],
): ManageMeetupCommunicationsResult {
	return {
		mode,
		intentIds: [],
		counts: {
			planned: 0,
			due: 0,
			alreadyRecorded: 0,
			reserved: 0,
			dispatched: 0,
			accepted: 0,
			uncertain: 0,
			rejected: 0,
			deferred: 0,
		},
		diagnostics: [],
		runtimeDiagnostics: Object.freeze([...runtimeDiagnostics]),
	};
}
