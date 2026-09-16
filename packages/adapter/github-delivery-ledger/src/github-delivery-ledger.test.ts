import type { DeliveryReservation } from "@meetup-automation/communication";
import { describe, expect, it } from "vitest";
import type { GithubLedgerComment } from "./comment-client.js";
import { GithubDeliveryLedger } from "./github-delivery-ledger.js";

class MemoryComments {
	comments: GithubLedgerComment[] = [];
	async listComments() {
		return this.comments;
	}
	async createComment(body: string) {
		this.comments.push({ id: 1, body, authorLogin: "automation[bot]" });
	}
	async updateComment(commentId: number, body: string) {
		const comment = this.comments.find(
			(candidate) => candidate.id === commentId,
		);
		if (!comment) throw new Error("missing comment");
		comment.body = body;
	}
}

const reservation: DeliveryReservation = {
	idempotencyKey: "meetup-v1-key",
	intentId: "intent-1",
	repositoryId: "repository-1",
	eventId: "event-1",
	kind: "host-introduction",
	recipientId: "contact-1",
	policyVersion: "1",
	reservedAt: "2026-09-04T10:00:00.000Z",
};

describe("GithubDeliveryLedger", () => {
	it("persists pending before accepting and refuses another reservation", async () => {
		// Arrange
		const comments = new MemoryComments();
		const ledger = new GithubDeliveryLedger(comments, {
			dispatchAuthorized: true,
			authorLogin: "automation[bot]",
		});

		// Act
		const pending = await ledger.reservePending(reservation);
		await ledger.markAccepted(
			reservation.idempotencyKey,
			"2026-09-04T10:00:01.000Z",
		);
		const repeated = await ledger.reservePending(reservation);

		// Assert
		expect(pending).toMatchObject({
			reserved: true,
			entry: { status: "pending" },
		});
		expect(repeated).toMatchObject({
			reserved: false,
			entry: { status: "accepted" },
		});
		expect(comments.comments[0]?.body).not.toContain("recipient@example");
		for (const sensitiveIdentifier of [
			reservation.idempotencyKey,
			reservation.intentId,
			reservation.repositoryId,
			reservation.eventId,
			reservation.recipientId,
		]) {
			expect(comments.comments[0]?.body).not.toContain(sensitiveIdentifier);
		}
		expect(comments.comments[0]?.body).toContain('"schemaVersion": 2');
	});

	it("rejects writes outside the workflow lock", async () => {
		// Arrange
		const ledger = new GithubDeliveryLedger(new MemoryComments(), {
			dispatchAuthorized: false,
			authorLogin: "automation[bot]",
		});

		// Act
		const operation = ledger.reservePending(reservation);

		// Assert
		await expect(operation).rejects.toThrow(/concurrency lock/);
	});

	it("preserves uncertain deliveries rather than making them retryable", async () => {
		// Arrange
		const ledger = new GithubDeliveryLedger(new MemoryComments(), {
			dispatchAuthorized: true,
			authorLogin: "automation[bot]",
		});

		// Act
		await ledger.reservePending(reservation);
		await ledger.markUncertain(
			reservation.idempotencyKey,
			"2026-09-04T10:00:01.000Z",
			"gateway-timeout",
		);
		const actual = await ledger.find(reservation.idempotencyKey);

		// Assert
		expect(actual).toMatchObject({
			status: "uncertain",
		});
	});

	it("releases only pending deliveries after a definitive retryable response", async () => {
		// Arrange
		const ledger = new GithubDeliveryLedger(new MemoryComments(), {
			dispatchAuthorized: true,
			authorLogin: "automation[bot]",
		});

		// Act
		await ledger.reservePending(reservation);
		const actual = await ledger.releasePending(reservation.idempotencyKey);
		const actual1 = await ledger.find(reservation.idempotencyKey);
		const operation = ledger.releasePending(reservation.idempotencyKey);

		// Assert
		expect(actual).toBe(undefined);
		expect(actual1).toBeUndefined();
		await expect(operation).rejects.toThrow(/not pending/);
	});

	it("ignores marker comments created by untrusted authors", async () => {
		// Arrange
		const comments = new MemoryComments();
		comments.comments.push({
			id: 99,
			authorLogin: "untrusted-user",
			body: `${"<!-- meetup-automation-delivery-ledger:v1 -->"}\n\n\`\`\`json\n{"schemaVersion":1,"entries":[]}\n\`\`\``,
		});
		const ledger = new GithubDeliveryLedger(comments, {
			dispatchAuthorized: true,
			authorLogin: "automation[bot]",
		});

		// Act
		const actual = await ledger.reservePending(reservation);

		// Assert
		expect(actual).toMatchObject({
			reserved: true,
		});
		expect(comments.comments).toHaveLength(2);
	});

	it("migrates a trusted version 1 ledger before matching and writing", async () => {
		// Arrange
		const comments = new MemoryComments();
		comments.comments.push({
			id: 1,
			authorLogin: "automation[bot]",
			body: `${"<!-- meetup-automation-delivery-ledger:v1 -->"}\n\n\`\`\`json\n${JSON.stringify(
				{
					schemaVersion: 1,
					entries: [
						{
							...reservation,
							status: "accepted",
							updatedAt: reservation.reservedAt,
						},
					],
				},
			)}\n\`\`\``,
		});
		const ledger = new GithubDeliveryLedger(comments, {
			dispatchAuthorized: true,
			authorLogin: "automation[bot]",
		});

		// Act
		const entry = await ledger.find(reservation.idempotencyKey);
		await ledger.markAccepted(
			reservation.idempotencyKey,
			"2026-09-04T10:00:02.000Z",
		);

		// Assert
		expect(entry).toMatchObject({
			status: "accepted",
		});
		expect(comments.comments[0]?.body).not.toContain(reservation.recipientId);
		expect(comments.comments[0]?.body).toContain('"schemaVersion": 2');
	});
});
