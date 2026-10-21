import { describe, expect, it } from "vitest";
import { MailBatchFingerprint } from "./mail-batch-fingerprint.js";
import type { MailMessageIntent } from "./model.js";

const message: MailMessageIntent = {
	channel: "mail",
	kind: "speaker-introduction",
	intentId: "intent-1",
	idempotencyKey: "intent-1",
	repositoryId: "repo-1",
	eventId: "event-1",
	policyVersion: "1",
	recipientId: "speaker-1",
	templateName: "meetup-intro-speakers",
	recipient: {
		channel: "mail",
		role: "speaker",
		recipientId: "speaker-1",
		email: "speaker@example.invalid",
		receivesCommunications: true,
	},
	placeholders: { eventDate: "2099-06-08", firstName: "Alex" },
};
describe("mail batch fingerprints", () => {
	it("ignores property order inside feedback talks without ignoring their content order", () => {
		// Arrange
		const first = { title: "First talk", url: "https://example.test/first" };
		const second = { title: "Second talk", url: "https://example.test/second" };
		const ordered = {
			...message,
			placeholders: { speakerFeedbackTalks: [first, second] },
		};
		const reorderedProperties = {
			...message,
			placeholders: {
				speakerFeedbackTalks: [
					{ url: first.url, title: first.title },
					{ url: second.url, title: second.title },
				],
			},
		};
		const reorderedTalks = {
			...message,
			placeholders: { speakerFeedbackTalks: [second, first] },
		};

		// Act
		const original = new MailBatchFingerprint().create(
			"2099-06-08",
			"Europe/Paris",
			[ordered],
		);
		const same = new MailBatchFingerprint().create(
			"2099-06-08",
			"Europe/Paris",
			[reorderedProperties],
		);
		const changed = new MailBatchFingerprint().create(
			"2099-06-08",
			"Europe/Paris",
			[reorderedTalks],
		);

		// Assert
		expect(same).toBe(original);
		expect(changed).not.toBe(original);
	});
	it("is stable across recipient and placeholder ordering", () => {
		// Arrange
		const second = {
			...message,
			idempotencyKey: "intent-2",
			recipientId: "speaker-2",
		};
		const expected = new MailBatchFingerprint().create(
			"2099-06-08",
			"Europe/Paris",
			[message, second],
		);

		// Act
		const actual = new MailBatchFingerprint().create(
			"2099-06-08",
			"Europe/Paris",
			[
				second,
				{
					...message,
					placeholders: { firstName: "Alex", eventDate: "2099-06-08" },
				},
			],
		);

		// Assert
		expect(actual).toBe(expected);
		expect(actual).toMatch(/^[a-f0-9]{64}$/);
	});
	it.each([
		{
			...message,
			recipient: { ...message.recipient, email: "changed@example.invalid" },
		},
		{ ...message, templateName: "meetup-thanks-speakers" as const },
		{ ...message, placeholders: { firstName: "Sam", eventDate: "2099-06-08" } },
		{ ...message, idempotencyKey: "policy-2-intent" },
	])("changes when outgoing email facts change %j", (changed) => {
		// Arrange
		const original = new MailBatchFingerprint().create(
			"2099-06-08",
			"Europe/Paris",
			[message],
		);

		// Act
		const actual = new MailBatchFingerprint().create(
			"2099-06-08",
			"Europe/Paris",
			[changed],
		);

		// Assert
		expect(actual).not.toBe(original);
	});
	it("changes when the event date changes", () => {
		// Arrange
		const original = new MailBatchFingerprint().create(
			"2099-06-08",
			"Europe/Paris",
			[message],
		);

		// Act
		const actual = new MailBatchFingerprint().create(
			"2099-06-09",
			"Europe/Paris",
			[message],
		);

		// Assert
		expect(actual).not.toBe(original);
	});
});
