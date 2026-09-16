import type { EventOccurrenceStatus, EventReadiness } from "./model.js";

export const COMMUNICATION_APPROVAL_SCHEMA_VERSION = 1 as const;

export type CommunicationApprovalPublicationUrls = Readonly<{
	meetup: string | null;
	community: string | null;
	assets: string | null;
}>;

export type CommunicationApprovalConfirmations = Readonly<{
	host: boolean;
	speakers: boolean;
}>;

/**
 * PII-free facts which can change message eligibility, recipients, routes, or
 * provider payloads. Referential contact fields deliberately do not belong in
 * this type: the checked-out automation revision binds those private values
 * without copying or hashing PII into the public approval record.
 */
export type CommunicationApprovalFacts = Readonly<{
	automationRevision: string;
	eventId: string;
	eventDate: string;
	occurrenceStatus: EventOccurrenceStatus;
	readiness: EventReadiness;
	policyVersion: string;
	mailingsRepository: string;
	notificationEnabled: boolean;
	notificationDestinationFingerprint: string | null;
	confirmations: CommunicationApprovalConfirmations;
	hostId: string | null;
	speakerIds: readonly string[];
	publicationUrls: CommunicationApprovalPublicationUrls;
}>;

export type CommunicationApprovalSnapshot = Readonly<{
	schemaVersion: typeof COMMUNICATION_APPROVAL_SCHEMA_VERSION;
	facts: CommunicationApprovalFacts;
}>;
