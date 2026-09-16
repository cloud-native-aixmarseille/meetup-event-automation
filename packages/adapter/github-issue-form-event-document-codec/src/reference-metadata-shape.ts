import {
	type LegacyReferenceMetadata,
	STABLE_ID_PATTERN,
	type StableReferenceBinding,
	type StableReferenceMetadata,
} from "./github-issue-form-event-document-codec-contracts.js";
import { ReferenceBindings } from "./reference-bindings.js";

export class ReferenceMetadataShape {
	static isReferenceMetadata(value: unknown): value is StableReferenceMetadata {
		if (typeof value !== "object" || value === null || Array.isArray(value)) {
			return false;
		}
		const candidate = value as Record<string, unknown>;
		if (candidate.schemaVersion !== 2) {
			return false;
		}
		if (
			candidate.host !== null &&
			!ReferenceMetadataShape.isReferenceBinding(candidate.host)
		) {
			return false;
		}
		return (
			Array.isArray(candidate.speakers) &&
			candidate.speakers.every(ReferenceMetadataShape.isReferenceBinding)
		);
	}

	static isLegacyReferenceMetadata(
		value: unknown,
	): value is LegacyReferenceMetadata {
		if (typeof value !== "object" || value === null || Array.isArray(value)) {
			return false;
		}
		const candidate = value as Record<string, unknown>;
		if (
			candidate.hostId !== null &&
			(typeof candidate.hostId !== "string" ||
				!STABLE_ID_PATTERN.test(candidate.hostId))
		) {
			return false;
		}
		if (!Array.isArray(candidate.agendaSpeakerIds)) {
			return false;
		}
		return candidate.agendaSpeakerIds.every(
			(entry) =>
				Array.isArray(entry) &&
				entry.every(
					(id) =>
						id === null ||
						(typeof id === "string" && STABLE_ID_PATTERN.test(id)),
				),
		);
	}

	static isReferenceBinding(value: unknown): value is StableReferenceBinding {
		if (typeof value !== "object" || value === null || Array.isArray(value)) {
			return false;
		}
		const candidate = value as Record<string, unknown>;
		return (
			typeof candidate.id === "string" &&
			STABLE_ID_PATTERN.test(candidate.id) &&
			typeof candidate.displayName === "string" &&
			candidate.displayName.length > 0 &&
			candidate.displayName ===
				ReferenceBindings.normalizeVisibleDisplayName(candidate.displayName)
		);
	}
}
