import type { DeliveryReservation } from "@meetup-automation/communication";
import { describe, expect, it } from "vitest";
import { inspectLedgerComment } from "../testing/ledger-comment.js";
import type { GithubLedgerComment } from "./comment-client.js";
import { GithubDeliveryLedgerComposition } from "./dependency-composition.js";
import { GithubDeliveryLedger } from "./github-delivery-ledger.js";
import { DELIVERY_LEDGER_MARKER } from "./github-delivery-ledger-contracts.js";

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
	it("keeps blocked and uncertain requests visible until acceptance is verified", async () => {
		// Arrange
		const comments = new MemoryComments();
		const ledger = new GithubDeliveryLedger(
			{
				ledgerEntryMapping:
					new GithubDeliveryLedgerComposition().ledgerEntryMapping(),
				ledgerCommentCodec:
					new GithubDeliveryLedgerComposition().ledgerCommentCodec(),
			},
			comments,
			{
				dispatchAuthorized: true,
				authorLogin: "automation[bot]",
			},
			new GithubDeliveryLedgerComposition().ledgerCommentPresenter(
				new GithubDeliveryLedgerComposition().ledgerMessages("en"),
			),
		);

		// Act
		await ledger.reservePending(reservation);
		const pending = await ledger.readAttention();
		await ledger.markRejected(
			reservation.idempotencyKey,
			"2099-06-01T10:00:00Z",
			"permission-denied",
		);
		const rejected = await ledger.readAttention();
		await ledger.markAccepted(
			reservation.idempotencyKey,
			"2099-06-01T11:00:00Z",
		);
		const accepted = await ledger.readAttention();

		// Assert
		expect(pending).toMatchObject([{ uncertain: true, commentId: 1 }]);
		expect(rejected).toMatchObject([{ uncertain: false, commentId: 1 }]);
		expect(accepted).toMatchObject([
			{ uncertain: false, resolved: true, commentId: 1 },
		]);
		expect(JSON.stringify(pending)).not.toContain(reservation.idempotencyKey);
	});

	it("persists pending before accepting and refuses another reservation", async () => {
		// Arrange
		const comments = new MemoryComments();
		const ledger = new GithubDeliveryLedger(
			{
				ledgerEntryMapping:
					new GithubDeliveryLedgerComposition().ledgerEntryMapping(),
				ledgerCommentCodec:
					new GithubDeliveryLedgerComposition().ledgerCommentCodec(),
			},
			comments,
			{
				dispatchAuthorized: true,
				authorLogin: "automation[bot]",
			},
			new GithubDeliveryLedgerComposition().ledgerCommentPresenter(
				new GithubDeliveryLedgerComposition().ledgerMessages("en"),
			),
		);

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
		const ledger = new GithubDeliveryLedger(
			{
				ledgerEntryMapping:
					new GithubDeliveryLedgerComposition().ledgerEntryMapping(),
				ledgerCommentCodec:
					new GithubDeliveryLedgerComposition().ledgerCommentCodec(),
			},
			new MemoryComments(),
			{
				dispatchAuthorized: false,
				authorLogin: "automation[bot]",
			},
			new GithubDeliveryLedgerComposition().ledgerCommentPresenter(
				new GithubDeliveryLedgerComposition().ledgerMessages("en"),
			),
		);

		// Act
		const operation = ledger.reservePending(reservation);

		// Assert
		await expect(operation).rejects.toThrow(/concurrency lock/);
	});

	it("preserves uncertain deliveries rather than making them retryable", async () => {
		// Arrange
		const ledger = new GithubDeliveryLedger(
			{
				ledgerEntryMapping:
					new GithubDeliveryLedgerComposition().ledgerEntryMapping(),
				ledgerCommentCodec:
					new GithubDeliveryLedgerComposition().ledgerCommentCodec(),
			},
			new MemoryComments(),
			{
				dispatchAuthorized: true,
				authorLogin: "automation[bot]",
			},
			new GithubDeliveryLedgerComposition().ledgerCommentPresenter(
				new GithubDeliveryLedgerComposition().ledgerMessages("en"),
			),
		);

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
		const ledger = new GithubDeliveryLedger(
			{
				ledgerEntryMapping:
					new GithubDeliveryLedgerComposition().ledgerEntryMapping(),
				ledgerCommentCodec:
					new GithubDeliveryLedgerComposition().ledgerCommentCodec(),
			},
			new MemoryComments(),
			{
				dispatchAuthorized: true,
				authorLogin: "automation[bot]",
			},
			new GithubDeliveryLedgerComposition().ledgerCommentPresenter(
				new GithubDeliveryLedgerComposition().ledgerMessages("en"),
			),
		);

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
		const ledger = new GithubDeliveryLedger(
			{
				ledgerEntryMapping:
					new GithubDeliveryLedgerComposition().ledgerEntryMapping(),
				ledgerCommentCodec:
					new GithubDeliveryLedgerComposition().ledgerCommentCodec(),
			},
			comments,
			{
				dispatchAuthorized: true,
				authorLogin: "automation[bot]",
			},
			new GithubDeliveryLedgerComposition().ledgerCommentPresenter(
				new GithubDeliveryLedgerComposition().ledgerMessages("en"),
			),
		);

		// Act
		const actual = await ledger.reservePending(reservation);

		// Assert
		expect(actual).toMatchObject({
			reserved: true,
		});
		expect(comments.comments).toHaveLength(2);
	});

	it.each([1, 2])(
		"preserves a trusted visible version %s ledger when rewriting its presentation",
		async (schemaVersion) => {
			// Arrange
			const comments = new MemoryComments();
			comments.comments.push({
				id: 1,
				authorLogin: "automation[bot]",
				body: `${"<!-- meetup-automation-delivery-ledger:v1 -->"}\n\n\`\`\`json\n${JSON.stringify(
					{
						schemaVersion,
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
			const ledger = new GithubDeliveryLedger(
				{
					ledgerEntryMapping:
						new GithubDeliveryLedgerComposition().ledgerEntryMapping(),
					ledgerCommentCodec:
						new GithubDeliveryLedgerComposition().ledgerCommentCodec(),
				},
				comments,
				{
					dispatchAuthorized: true,
					authorLogin: "automation[bot]",
				},
				new GithubDeliveryLedgerComposition().ledgerCommentPresenter(
					new GithubDeliveryLedgerComposition().ledgerMessages("en"),
				),
			);

			// Act
			const entry = await ledger.find(reservation.idempotencyKey);
			await ledger.markAccepted(
				reservation.idempotencyKey,
				"2026-09-04T10:00:02.000Z",
			);
			const repeated = await ledger.reservePending(reservation);
			const { visible } = inspectLedgerComment(
				comments.comments[0]?.body ?? "",
			);

			// Assert
			expect(entry).toMatchObject({
				status: "accepted",
			});
			expect(comments.comments[0]?.body).not.toContain(reservation.recipientId);
			expect(comments.comments[0]?.body).toContain('"schemaVersion": 2');
			expect(visible).toContain("Host introduction: Accepted (1)");
			expect(visible).not.toContain("schemaVersion");
			expect(repeated).toMatchObject({
				reserved: false,
				entry: { status: "accepted" },
			});
		},
	);

	it.each([
		["missing opening fence", '{"schemaVersion":2,"entries":[]}\n```'],
		["missing closing fence", '```json\n{"schemaVersion":2,"entries":[]}'],
		["unclosed whitespace block", `\`\`\`json${" ".repeat(65_536)}`],
		["empty block", "```json\n```"],
		["whitespace block", `\`\`\`json${" ".repeat(65_536)}\`\`\``],
	])("rejects a trusted ledger with a %s", async (_name, block) => {
		// Arrange
		const comments = new MemoryComments();
		const body = `${DELIVERY_LEDGER_MARKER}\n\n${block}`;
		comments.comments.push({ id: 1, body, authorLogin: "automation[bot]" });
		const ledger = new GithubDeliveryLedger(
			{
				ledgerEntryMapping:
					new GithubDeliveryLedgerComposition().ledgerEntryMapping(),
				ledgerCommentCodec:
					new GithubDeliveryLedgerComposition().ledgerCommentCodec(),
			},
			comments,
			{
				dispatchAuthorized: true,
				authorLogin: "automation[bot]",
			},
			new GithubDeliveryLedgerComposition().ledgerCommentPresenter(
				new GithubDeliveryLedgerComposition().ledgerMessages("en"),
			),
		);

		// Act
		const operation = ledger.reservePending(reservation);

		// Assert
		await expect(operation).rejects.toThrow(/corrupted/);
		expect(comments.comments).toEqual([
			{ id: 1, body, authorLogin: "automation[bot]" },
		]);
	});

	it.each(["", "\r\n\t", " ".repeat(65_536)])(
		"reads a ledger with surrounding JSON whitespace variant %#",
		async (whitespace) => {
			// Arrange
			const value = {
				schemaVersion: 1,
				entries: [
					{
						...reservation,
						status: "accepted",
						updatedAt: reservation.reservedAt,
					},
				],
			};
			const comments = new MemoryComments();
			comments.comments.push({
				id: 1,
				authorLogin: "automation[bot]",
				body: `${DELIVERY_LEDGER_MARKER}\n\n\`\`\`json${whitespace}${JSON.stringify(value)}${whitespace}\`\`\`\n\n</details>`,
			});
			const ledger = new GithubDeliveryLedger(
				{
					ledgerEntryMapping:
						new GithubDeliveryLedgerComposition().ledgerEntryMapping(),
					ledgerCommentCodec:
						new GithubDeliveryLedgerComposition().ledgerCommentCodec(),
				},
				comments,
				{
					dispatchAuthorized: false,
					authorLogin: "automation[bot]",
				},
				new GithubDeliveryLedgerComposition().ledgerCommentPresenter(
					new GithubDeliveryLedgerComposition().ledgerMessages("en"),
				),
			);

			// Act
			const entry = await ledger.find(reservation.idempotencyKey);

			// Assert
			expect(entry).toMatchObject({
				status: "accepted",
				updatedAt: reservation.reservedAt,
			});
		},
	);
});
