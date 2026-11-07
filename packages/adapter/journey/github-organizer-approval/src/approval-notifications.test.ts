import { describe, expect, it, vi } from "vitest";
import { createStoredApproval, request } from "../testing/approval.fixtures.js";
import { ApprovalNotifications } from "./approval-notifications.js";
import type { StoredApproval } from "./approval-state.js";

function fixture() {
	const events: string[] = [];
	const client = {
		replace: vi.fn(async (_id: number, _before: string, after: string) => {
			events.push(`persist:${after}`);
		}),
		url: vi
			.fn()
			.mockReturnValue(
				"https://github.com/example/events/issues/1#issuecomment-42",
			),
	};
	const presenter = {
		issue: vi.fn((record: StoredApproval) => record.notification),
	};
	const message = { destination: "organizers", messageId: "message-1" };
	const notifications = {
		react: vi.fn().mockResolvedValue(true),
	};
	return {
		client,
		presenter,
		notifications,
		events,
		message,
		subject: new ApprovalNotifications(client, presenter, notifications),
	};
}

describe("approval notification delivery", () => {
	it("records a decision reaction on its original message", async () => {
		// Arrange
		const f = fixture();
		const record = createStoredApproval({ ...request, kind: "email-thanks" });
		record.decision = {
			status: "rejected",
			actor: "organizer",
			decidedAt: request.requestedAt,
		};
		record.notificationMessage = f.message;

		// Act
		const failed = await f.subject.react(record, 42);

		// Assert
		expect(failed).toBe(false);
		expect(f.notifications.react).toHaveBeenCalledExactlyOnceWith(
			f.message,
			"rejected",
		);
		expect(record.reactionSent).toBe(true);
		expect(f.client.replace).toHaveBeenCalledOnce();
	});
});
