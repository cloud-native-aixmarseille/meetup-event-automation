import type { ParticipantReference } from "@meetup-automation/event";
import type { StableReferenceBinding } from "./github-issue-form-event-document-codec-contracts.js";

export class ReferenceBindings {
	referenceBinding(
		participant: ParticipantReference,
		id: string,
	): StableReferenceBinding {
		return {
			id,
			displayName: this.normalizeVisibleDisplayName(participant.displayName),
		};
	}

	normalizeVisibleDisplayName(displayName: string): string {
		return displayName.trim().replace(/\s+/g, " ");
	}

	restoreBoundReference(
		participant: ParticipantReference | undefined,
		binding: StableReferenceBinding | null,
	): ParticipantReference | undefined {
		if (!participant || participant.id || !binding) {
			return participant;
		}
		return this.normalizeVisibleDisplayName(participant.displayName) ===
			binding.displayName
			? { ...participant, id: binding.id }
			: participant;
	}

	restoreBoundSpeaker(
		participant: ParticipantReference,
		bindings: readonly StableReferenceBinding[],
	): ParticipantReference {
		if (participant.id) {
			return participant;
		}

		const visibleName = this.normalizeVisibleDisplayName(
			participant.displayName,
		);
		const matchingIds = new Set(
			bindings
				.filter(({ displayName }) => displayName === visibleName)
				.map(({ id }) => id),
		);
		if (matchingIds.size !== 1) {
			return participant;
		}
		const id = matchingIds.values().next().value;
		return id ? { ...participant, id } : participant;
	}
}
