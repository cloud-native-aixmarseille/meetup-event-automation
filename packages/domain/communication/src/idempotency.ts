import type { CommunicationKind } from "./model.js";

const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/;

export type CommunicationIdempotencyComponents = {
	readonly repositoryId: string;
	readonly eventId: string;
	readonly kind: CommunicationKind;
	readonly recipientId: string;
	readonly policyVersion: string;
};

export class CommunicationIdempotency {
	static isSafeCommunicationIdentifier(value: string): boolean {
		return SAFE_IDENTIFIER_PATTERN.test(value);
	}

	static createCommunicationIdempotencyKey(
		components: CommunicationIdempotencyComponents,
	): string {
		const values = [
			components.repositoryId,
			components.eventId,
			components.recipientId,
			components.policyVersion,
		];

		if (!values.every(CommunicationIdempotency.isSafeCommunicationIdentifier)) {
			throw new Error(
				"Communication identifiers must be stable, opaque, and PII-free",
			);
		}

		return [
			"meetup-communication:v1",
			`repository=${encodeURIComponent(components.repositoryId)}`,
			`event=${encodeURIComponent(components.eventId)}`,
			`kind=${components.kind}`,
			`recipient=${encodeURIComponent(components.recipientId)}`,
			`policy=${encodeURIComponent(components.policyVersion)}`,
		].join("|");
	}
}
