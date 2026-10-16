import { describe, expect, it } from "vitest";
import { request } from "../testing/approval.fixtures.js";
import { ApprovalRecord } from "./approval-record.js";

const detailed = {
	...request,
	details: {
		emails: [
			{
				kind: "speaker-introduction" as const,
				recipientName: "Alex Example",
				links: [],
				omittedLinks: 0,
			},
		],
		omittedEmails: 1,
	},
};

describe("approval details in persisted records", () => {
	it("requires a fresh pending request when adding details to a stored request", () => {
		// Arrange
		const record = ApprovalRecord.create(request);

		// Act
		const matches = ApprovalRecord.matches(record, detailed);

		// Assert
		expect(matches).toBe(false);
	});

	it("preserves a final decision when only the public summary is added", () => {
		// Arrange
		const record = {
			...ApprovalRecord.create(request),
			decision: {
				status: "approved" as const,
				actor: "organizer",
				decidedAt: request.requestedAt,
			},
		};

		// Act
		const matches = ApprovalRecord.matches(record, detailed);

		// Assert
		expect(matches).toBe(true);
	});

	it("continues reading stored approvals without details", () => {
		// Arrange
		const record = ApprovalRecord.create(request);
		const body = ApprovalRecord.marker(record);

		// Act
		const restored = ApprovalRecord.read(body);

		// Assert
		expect(restored).toEqual(record);
	});
});
