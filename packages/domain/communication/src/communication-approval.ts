import {
	COMMUNICATION_APPROVAL_SCHEMA_VERSION,
	type CommunicationApprovalFacts,
	type CommunicationApprovalSnapshot,
} from "./approval-contracts.js";
import { ApprovalFacts } from "./approval-facts.js";
import { ApprovalShape } from "./approval-shape.js";
import { ApprovalValueValidation } from "./approval-value-validation.js";

export class CommunicationApproval {
	/**
	 * Create the canonical approval representation. Speaker identity is a set, so
	 * IDs are trimmed, deduplicated, and sorted. Public URLs are trimmed and have
	 * one trailing slash removed, matching event/publication normalization.
	 */
	static createCommunicationApprovalSnapshot(
		facts: CommunicationApprovalFacts,
	): CommunicationApprovalSnapshot {
		return Object.freeze({
			schemaVersion: COMMUNICATION_APPROVAL_SCHEMA_VERSION,
			facts: ApprovalFacts.normalizeFacts(facts),
		});
	}

	/**
	 * Compare approval-bound facts. Speaker ordering and duplicate agenda
	 * appearances do not invalidate approval; every other normalized fact must be
	 * exactly equal.
	 */
	static communicationApprovalFactsEqual(
		left: CommunicationApprovalFacts,
		right: CommunicationApprovalFacts,
	): boolean {
		try {
			return (
				ApprovalFacts.factsKey(ApprovalFacts.normalizeFacts(left)) ===
				ApprovalFacts.factsKey(ApprovalFacts.normalizeFacts(right))
			);
		} catch {
			return false;
		}
	}

	static communicationApprovalMatches(
		approved: CommunicationApprovalSnapshot | undefined,
		currentFacts: CommunicationApprovalFacts,
	): boolean {
		return (
			approved?.schemaVersion === COMMUNICATION_APPROVAL_SCHEMA_VERSION &&
			CommunicationApproval.communicationApprovalFactsEqual(
				approved.facts,
				currentFacts,
			)
		);
	}

	/** Parse a strict, technology-independent representation from an adapter. */
	static parseCommunicationApprovalSnapshot(
		value: unknown,
	): CommunicationApprovalSnapshot {
		if (!ApprovalShape.isExactRecord(value, ["schemaVersion", "facts"])) {
			throw ApprovalValueValidation.invalidSnapshot();
		}
		if (value.schemaVersion !== COMMUNICATION_APPROVAL_SCHEMA_VERSION) {
			throw ApprovalValueValidation.invalidSnapshot();
		}
		const facts = value.facts;
		CommunicationApproval.assertFacts(facts);

		return CommunicationApproval.createCommunicationApprovalSnapshot({
			automationRevision: facts.automationRevision,
			eventId: facts.eventId,
			eventDate: facts.eventDate,
			occurrenceStatus: facts.occurrenceStatus,
			readiness: facts.readiness,
			policyVersion: facts.policyVersion,
			mailingsRepository: facts.mailingsRepository,
			notificationEnabled: facts.notificationEnabled,
			notificationDestinationFingerprint:
				facts.notificationDestinationFingerprint,
			confirmations: {
				host: facts.confirmations.host,
				speakers: facts.confirmations.speakers,
			},
			hostId: facts.hostId,
			speakerIds: facts.speakerIds,
			publicationUrls: {
				meetup: facts.publicationUrls.meetup,
				community: facts.publicationUrls.community,
				assets: facts.publicationUrls.assets,
			},
		});
	}

	private static assertFacts(
		facts: unknown,
	): asserts facts is CommunicationApprovalFacts {
		if (
			!ApprovalShape.isExactRecord(facts, [
				"automationRevision",
				"eventId",
				"eventDate",
				"occurrenceStatus",
				"readiness",
				"policyVersion",
				"mailingsRepository",
				"notificationEnabled",
				"notificationDestinationFingerprint",
				"confirmations",
				"hostId",
				"speakerIds",
				"publicationUrls",
			])
		) {
			throw ApprovalValueValidation.invalidSnapshot();
		}
		if (
			!ApprovalShape.isExactRecord(facts.confirmations, ["host", "speakers"])
		) {
			throw ApprovalValueValidation.invalidSnapshot();
		}
		if (
			!ApprovalShape.isExactRecord(facts.publicationUrls, [
				"meetup",
				"community",
				"assets",
			])
		) {
			throw ApprovalValueValidation.invalidSnapshot();
		}
		if (
			typeof facts.automationRevision !== "string" ||
			typeof facts.eventId !== "string" ||
			typeof facts.eventDate !== "string" ||
			!ApprovalShape.isOccurrenceStatus(facts.occurrenceStatus) ||
			!ApprovalShape.isReadiness(facts.readiness) ||
			typeof facts.policyVersion !== "string" ||
			typeof facts.mailingsRepository !== "string" ||
			typeof facts.notificationEnabled !== "boolean" ||
			!ApprovalShape.isNullableString(
				facts.notificationDestinationFingerprint,
			) ||
			typeof facts.confirmations.host !== "boolean" ||
			typeof facts.confirmations.speakers !== "boolean" ||
			(facts.hostId !== null && typeof facts.hostId !== "string") ||
			!Array.isArray(facts.speakerIds) ||
			!facts.speakerIds.every((id) => typeof id === "string") ||
			!ApprovalShape.isNullableString(facts.publicationUrls.meetup) ||
			!ApprovalShape.isNullableString(facts.publicationUrls.community) ||
			!ApprovalShape.isNullableString(facts.publicationUrls.assets)
		) {
			throw ApprovalValueValidation.invalidSnapshot();
		}
	}
}
