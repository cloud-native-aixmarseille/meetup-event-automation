import { describe, expect, it, vi } from "vitest";
import { request } from "../testing/approval.fixtures.js";
import { ApprovalCommentCodec } from "./approval-comment-codec.js";
import { ApprovalRecordFactory } from "./approval-record-factory.js";

describe("approval storage identity allocation", () => {
	it("uses the injected identity only when creating a new request", () => {
		// Arrange
		const identity = vi
			.fn()
			.mockReturnValue("00000000-0000-4000-8000-000000000001");
		const factory = new ApprovalRecordFactory(identity);

		// Act
		const record = factory.create(request);
		const restored = ApprovalCommentCodec.read(
			ApprovalCommentCodec.marker(record),
		);

		// Assert
		expect(identity).toHaveBeenCalledOnce();
		expect(record.requestId).toBe(
			"approval-00000000-0000-4000-8000-000000000001",
		);
		expect(restored).toEqual(record);
	});

	it("rejects an empty batch before allocating an identity", () => {
		// Arrange
		const identity = vi.fn();
		const factory = new ApprovalRecordFactory(identity);

		// Act
		const create = () => factory.create({ ...request, recipientCount: 0 });

		// Assert
		expect(create).toThrow("Invalid approval recipient count");
		expect(identity).not.toHaveBeenCalled();
	});

	it("represents post-event progress as a placeholder without a decision", () => {
		// Arrange
		const factory = new ApprovalRecordFactory(
			() => "00000000-0000-4000-8000-000000000001",
		);

		// Act
		const record = factory.placeholder({
			eventDate: request.eventDate,
			requestedAt: request.requestedAt,
			active: true,
			pendingTasks: ["thank-host"],
		});
		const restored = ApprovalCommentCodec.read(
			ApprovalCommentCodec.marker(record),
		);

		// Assert
		expect(restored.recipientCount).toBe(0);
		expect(restored.decision).toBeUndefined();
		expect(restored.followUp?.pendingTasks).toEqual(["thank-host"]);
	});
});
