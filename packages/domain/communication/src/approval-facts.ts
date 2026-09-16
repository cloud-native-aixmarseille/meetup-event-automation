import type { CommunicationApprovalFacts } from "./approval-contracts.js";
import { ApprovalShape } from "./approval-shape.js";
import { ApprovalValueValidation } from "./approval-value-validation.js";
import { CommunicationApprovalSnapshotError } from "./communication-approval-snapshot-error.js";

export class ApprovalFacts {
	static normalizeFacts(
		facts: CommunicationApprovalFacts,
	): CommunicationApprovalFacts {
		const automationRevision = ApprovalValueValidation.requireSafeIdentifier(
			facts.automationRevision,
			"automationRevision",
		);
		const eventId = ApprovalValueValidation.requireSafeIdentifier(
			facts.eventId,
			"eventId",
		);
		const eventDate = ApprovalValueValidation.requireIsoDate(facts.eventDate);
		if (!ApprovalShape.isOccurrenceStatus(facts.occurrenceStatus)) {
			throw new CommunicationApprovalSnapshotError(
				"occurrenceStatus must be a supported event status",
			);
		}
		if (!ApprovalShape.isReadiness(facts.readiness)) {
			throw new CommunicationApprovalSnapshotError(
				"readiness must be ready or not-ready",
			);
		}
		const policyVersion = ApprovalValueValidation.requireSafeIdentifier(
			facts.policyVersion,
			"policyVersion",
		);
		const mailingsRepository = ApprovalValueValidation.requireSafeIdentifier(
			facts.mailingsRepository,
			"mailingsRepository",
		);
		const notificationDestinationFingerprint =
			ApprovalFacts.notificationFingerprint(facts);
		if (
			typeof facts.confirmations?.host !== "boolean" ||
			typeof facts.confirmations?.speakers !== "boolean"
		) {
			throw new CommunicationApprovalSnapshotError(
				"confirmations must contain host and speakers booleans",
			);
		}
		const hostId =
			facts.hostId === null
				? null
				: ApprovalValueValidation.requireSafeIdentifier(facts.hostId, "hostId");
		const speakerIds = ApprovalFacts.speakerIds(facts);
		const { confirmations, publicationUrls } = ApprovalFacts.publication(facts);

		return Object.freeze({
			automationRevision,
			eventId,
			eventDate,
			occurrenceStatus: facts.occurrenceStatus,
			readiness: facts.readiness,
			policyVersion,
			mailingsRepository,
			notificationEnabled: facts.notificationEnabled,
			notificationDestinationFingerprint,
			confirmations,
			hostId,
			speakerIds: Object.freeze(speakerIds),
			publicationUrls,
		});
	}

	static factsKey(facts: CommunicationApprovalFacts): string {
		return JSON.stringify(facts);
	}

	static compareText(left: string, right: string): number {
		return left < right ? -1 : left > right ? 1 : 0;
	}

	private static notificationFingerprint(facts: CommunicationApprovalFacts) {
		if (typeof facts.notificationEnabled !== "boolean") {
			throw new CommunicationApprovalSnapshotError(
				"notificationEnabled must be a boolean",
			);
		}
		const notificationDestinationFingerprint =
			facts.notificationDestinationFingerprint === null
				? null
				: ApprovalValueValidation.requireSha256Fingerprint(
						facts.notificationDestinationFingerprint,
						"notificationDestinationFingerprint",
					);
		if (
			!facts.notificationEnabled &&
			notificationDestinationFingerprint !== null
		) {
			throw new CommunicationApprovalSnapshotError(
				"notificationDestinationFingerprint must be null when notifications are disabled",
			);
		}

		return notificationDestinationFingerprint;
	}

	private static speakerIds(facts: CommunicationApprovalFacts) {
		if (!Array.isArray(facts.speakerIds)) {
			throw new CommunicationApprovalSnapshotError(
				"speakerIds must be an array of stable identifiers",
			);
		}
		const speakerIds = [
			...new Set(
				facts.speakerIds.map((id) =>
					ApprovalValueValidation.requireSafeIdentifier(id, "speakerIds"),
				),
			),
		].sort(ApprovalFacts.compareText);

		return speakerIds;
	}

	private static publication(facts: CommunicationApprovalFacts) {
		if (!facts.publicationUrls || typeof facts.publicationUrls !== "object") {
			throw new CommunicationApprovalSnapshotError(
				"publicationUrls must contain public event URL fields",
			);
		}

		const confirmations = Object.freeze({
			host: facts.confirmations.host,
			speakers: facts.confirmations.speakers,
		});
		const publicationUrls = Object.freeze({
			meetup: ApprovalValueValidation.normalizePublicUrl(
				facts.publicationUrls.meetup,
				"meetup",
			),
			community: ApprovalValueValidation.normalizePublicUrl(
				facts.publicationUrls.community,
				"community",
			),
			assets: ApprovalValueValidation.normalizePublicUrl(
				facts.publicationUrls.assets,
				"assets",
			),
		});

		return { confirmations, publicationUrls };
	}
}
