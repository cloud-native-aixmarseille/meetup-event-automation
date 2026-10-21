import { describe, expect, it } from "vitest";
import {
	createStoredApproval,
	detailedRequest,
	publicationRequest,
	request,
} from "../testing/approval.fixtures.js";
import {
	APPROVAL_MARKER,
	ApprovalCommentCodec,
} from "./approval-comment-codec.js";

describe("versioned approval comment metadata", () => {
	it.each([request, detailedRequest, publicationRequest])(
		"round-trips supported $kind state without changing marker bytes",
		(input) => {
			// Arrange
			const record = createStoredApproval(input);
			const body = ApprovalCommentCodec.marker(record);

			// Act
			const restored = ApprovalCommentCodec.read(body);
			const encoded = ApprovalCommentCodec.marker(restored);

			// Assert
			expect(restored).toEqual(record);
			expect(encoded).toBe(body);
		},
	);

	it("retains stored property order for exact checkbox verification", () => {
		// Arrange
		const { revision, ...rest } = createStoredApproval(detailedRequest);
		const body = ApprovalCommentCodec.marker({ ...rest, revision });

		// Act
		const restored = ApprovalCommentCodec.read(body);
		const encoded = ApprovalCommentCodec.marker(restored);

		// Assert
		expect(encoded).toBe(body);
	});

	it.each([
		null,
		false,
		42,
		"request",
		[],
		{ ...request, revision: null },
		{ ...request, kind: ["email-introduction"] },
		{ ...request, details: { emails: [null], omittedEmails: 1 } },
		{ ...publicationRequest, publication: { venue: null } },
	])(
		"rejects malformed metadata before exposing a typed record: %j",
		(value) => {
			// Arrange
			const body = `${APPROVAL_MARKER}${JSON.stringify(value)} -->`;

			// Act
			const read = () => ApprovalCommentCodec.read(body);

			// Assert
			expect(read).toThrow();
		},
	);

	it.each([
		{ decision: null },
		{
			decision: {
				status: "approved",
				actor: "bot\ninjected",
				decidedAt: request.requestedAt,
			},
		},
		{ notificationMessage: null },
		{ notificationMessage: { destination: "channel", messageId: 1 } },
		{ reactionSent: true },
		{ followUp: null },
		{ followUp: { active: true, pendingTasks: ["thank-host"] } },
		{ recipientCount: 0 },
		{ recipientCount: "2" },
		{ eventDate: "2099-02-30" },
	])("rejects contradictory or invalid persisted state: %j", (override) => {
		// Arrange
		const value = { ...createStoredApproval(request), ...override };
		const body = `${APPROVAL_MARKER}${JSON.stringify(value)} -->`;

		// Act
		const read = () => ApprovalCommentCodec.read(body);

		// Assert
		expect(read).toThrow();
	});
});
