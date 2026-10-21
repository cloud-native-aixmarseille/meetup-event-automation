import { describe, expect, it } from "vitest";
import { GithubOrganizerApprovalComposition } from "./dependency-composition.js";
import type { StoredFollowUp } from "./follow-up-schema.js";
import { FollowUpSchema } from "./follow-up-schema.js";

describe("follow-up state validation", () => {
	it.each([
		{ pendingTasks: ["unknown-task"] },
		{ pendingTasks: ["thank-host", "thank-host"] },
		{ active: "yes" },
		{ attention: 42 },
		{ attention: "a".repeat(50001) },
		{ attentionDetails: "a".repeat(20001) },
	])("rejects unsupported or unbounded metadata %#", (override) => {
		// Arrange
		const record = {
			active: true,
			pendingTasks: ["thank-host"],
			...override,
		} as StoredFollowUp;

		// Act
		const validate = () =>
			new FollowUpSchema({
				approvalSchema:
					new GithubOrganizerApprovalComposition().approvalSchema(),
			}).validate(record);

		// Assert
		expect(validate).toThrow("Invalid post-event follow-up state");
	});
});
