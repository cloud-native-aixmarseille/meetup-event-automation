import { describe, expect, it } from "vitest";
import { CommunicationIdempotency } from "./idempotency.js";

describe("createCommunicationIdempotencyKey", () => {
	it("is deterministic and includes every stable policy dimension", () => {
		// Arrange
		const components = {
			repositoryId: "cloud-native-aixmarseille/meetups",
			eventId: "issue:123",
			kind: "host-introduction" as const,
			recipientId: "host-contact-42",
			policyVersion: "communication-v2",
		};
		const variants = [
			{ ...components, repositoryId: "another/repository" },
			{ ...components, eventId: "issue:124" },
			{ ...components, kind: "host-thanks" as const },
			{ ...components, recipientId: "host-contact-43" },
			{ ...components, policyVersion: "communication-v3" },
		];

		// Act
		const key =
			CommunicationIdempotency.createCommunicationIdempotencyKey(components);
		const repeatedKey =
			CommunicationIdempotency.createCommunicationIdempotencyKey(components);
		const changedKeys = variants.map(
			CommunicationIdempotency.createCommunicationIdempotencyKey,
		);

		// Assert
		expect(repeatedKey).toBe(key);
		expect(key).toContain("repository=cloud-native-aixmarseille%2Fmeetups");
		expect(key).toContain("event=issue%3A123");
		expect(key).toContain("kind=host-introduction");
		expect(key).toContain("recipient=host-contact-42");
		expect(key).toContain("policy=communication-v2");
		for (const changedKey of changedKeys) {
			expect(changedKey).not.toBe(key);
		}
	});

	it("rejects contact data in identifier positions", () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const act = () =>
			CommunicationIdempotency.createCommunicationIdempotencyKey({
				repositoryId: "cloud-native-aixmarseille/meetups",
				eventId: "issue:123",
				kind: "host-introduction",
				recipientId: "person@example.test",
				policyVersion: "communication-v2",
			});

		// Assert
		expect(act).toThrow("PII-free");
	});
});
