import { describe, expect, it } from "vitest";
import type { OrganizerApprovalRequest } from "../ports/organizer-approval.js";
import { FOLLOW_UP_TASKS } from "../ports/organizer-follow-up.js";
import { FollowUpApprovalPolicy } from "./follow-up-approval-policy.js";

const request: OrganizerApprovalRequest = {
	kind: "email-thanks",
	revision: "a".repeat(64),
	eventDate: "2099-06-08",
	requestedAt: "2099-06-09T10:00:00Z",
	recipientCount: 1,
};
describe("follow-up approval progress", () => {
	it("keeps existing progress when a thank-you batch changes", () => {
		// Arrange
		const progress = { active: true, pendingTasks: ["share-slides"] as const };
		const policy = new FollowUpApprovalPolicy();

		// Act
		const result = policy.initialFor(request, progress);

		// Assert
		expect(result).toEqual(progress);
	});
	it("initializes all follow-up tasks for a thank-you batch", () => {
		// Arrange
		const policy = new FollowUpApprovalPolicy();

		// Act
		const result = policy.initialFor(request);

		// Assert
		expect(result).toEqual({ active: true, pendingTasks: FOLLOW_UP_TASKS });
	});
	it("keeps introduction requests independent of follow-up", () => {
		// Arrange
		const policy = new FollowUpApprovalPolicy();
		const introduction = { ...request, kind: "email-introduction" as const };

		// Act
		const result = policy.initialFor(introduction);

		// Assert
		expect(result).toBeUndefined();
	});
	it.each([
		[false, 1, ["thank-host"], "stopped"],
		[true, 1, ["thank-host"], "review"],
		[true, 0, ["thank-host"], "waiting"],
		[true, 0, ["thank-speakers"], "waiting"],
		[true, 0, ["share-slides"], "emails-complete"],
	] as const)(
		"classifies active=%s recipients=%s tasks=%s",
		(active, count, pendingTasks, expected) => {
			// Arrange
			const policy = new FollowUpApprovalPolicy();

			// Act
			const result = policy.progressState({ active, pendingTasks }, count);

			// Assert
			expect(result).toBe(expected);
		},
	);
	it.each([
		[false, "2099-07-08", true],
		[true, "2099-06-08", true],
		[true, "2099-07-08", false],
	] as const)(
		"retains active=%s progress for %s: %s",
		(active, eventDate, expected) => {
			// Arrange
			const policy = new FollowUpApprovalPolicy();
			const input = {
				eventDate: request.eventDate,
				requestedAt: request.requestedAt,
				active,
				pendingTasks: FOLLOW_UP_TASKS,
			};

			// Act
			const result = policy.retainRequest(input, eventDate);

			// Assert
			expect(result).toBe(expected);
		},
	);
});
