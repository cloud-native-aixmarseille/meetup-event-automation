import type { ApprovalNotificationFacts } from "@meetup-automation/journey";
import { describe, expect, it, vi } from "vitest";
import { createStoredApproval, request } from "../testing/approval.fixtures.js";
import { ApprovalNotifications } from "./approval-notifications.js";
import type { StoredApproval } from "./approval-state.js";

function fixture(facts: ApprovalNotificationFacts | undefined) {
	const events: string[] = [];
	const policy = { notificationFor: vi.fn().mockReturnValue(facts) };
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
		send: vi.fn(async () => {
			events.push("send");
			return { outcome: "accepted" as const, message };
		}),
		react: vi.fn().mockResolvedValue(true),
	};
	return {
		policy,
		client,
		presenter,
		notifications,
		events,
		message,
		subject: new ApprovalNotifications(
			policy,
			client,
			presenter,
			notifications,
			"organizers",
		),
	};
}

describe("approval notification delivery", () => {
	it.each(["send", "react"] as const)(
		"performs no %s effects when the injected policy excludes a request",
		async (operation) => {
			// Arrange
			const f = fixture(undefined);
			const record = createStoredApproval(request);
			record.decision = {
				status: "approved",
				actor: "organizer",
				decidedAt: request.requestedAt,
			};
			record.notificationMessage = f.message;
			const before = { ...record };

			// Act
			const failed = await f.subject[operation](record, 42);

			// Assert
			expect(failed).toBe(false);
			expect(record).toEqual(before);
			expect(f.client.replace).not.toHaveBeenCalled();
			expect(f.client.url).not.toHaveBeenCalled();
			expect(f.presenter.issue).not.toHaveBeenCalled();
			expect(f.notifications.send).not.toHaveBeenCalled();
			expect(f.notifications.react).not.toHaveBeenCalled();
		},
	);

	it("reserves delivery and sends the policy's facts without selecting an approval kind", async () => {
		// Arrange
		const facts: ApprovalNotificationFacts = {
			kind: "meetup-publication",
			eventDate: request.eventDate,
		};
		const f = fixture(facts);
		const record = createStoredApproval({ ...request, kind: "email-thanks" });

		// Act
		const failed = await f.subject.send(record, 42);

		// Assert
		expect(failed).toBe(false);
		expect(f.notifications.send).toHaveBeenCalledExactlyOnceWith({
			...facts,
			destination: "organizers",
			approvalUrl: "https://github.com/example/events/issues/1#issuecomment-42",
		});
		expect(f.events).toEqual(["persist:reserved", "send", "persist:sent"]);
		expect(record.notificationMessage).toEqual(f.message);
	});

	it("uses the injected policy for decision reactions as well as posts", async () => {
		// Arrange
		const f = fixture({
			kind: "meetup-publication",
			eventDate: request.eventDate,
		});
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
		expect(f.notifications.send).not.toHaveBeenCalled();
	});
});
