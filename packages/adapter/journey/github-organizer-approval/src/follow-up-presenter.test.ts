import { FollowUpApprovalPolicy } from "@meetup-automation/journey";
import { describe, expect, it } from "vitest";
import { createStoredApproval, request } from "../testing/approval.fixtures.js";
import { GithubOrganizerApprovalComposition } from "./dependency-composition.js";
import { FollowUpPresenter } from "./follow-up-presenter.js";

describe("follow-up task presentation", () => {
	it.each([
		["en", "⏳ Thank the speakers", "Thank the host"],
		["fr", "⏳ Remercier les intervenants", "Remercier l'hôte"],
	])("shows only pending tasks in %s", (locale, pending, completed) => {
		// Arrange
		const presenter = new FollowUpPresenter(
			new FollowUpApprovalPolicy(),
			new GithubOrganizerApprovalComposition().approvalMessages(locale),
		);
		const record = createStoredApproval({ ...request, kind: "email-thanks" });
		record.followUp = { active: true, pendingTasks: ["thank-speakers"] };

		// Act
		const lines = presenter.render(record);

		// Assert
		expect(lines.filter((line) => line.startsWith("⏳"))).toEqual([pending]);
		expect(lines.join("\n")).not.toContain(completed);
		expect(lines.join("\n")).not.toContain("✅");
	});

	it("omits task rows when all follow-up tasks are complete", () => {
		// Arrange
		const presenter = new FollowUpPresenter(
			new FollowUpApprovalPolicy(),
			new GithubOrganizerApprovalComposition().approvalMessages("en"),
		);
		const record = createStoredApproval({ ...request, kind: "email-thanks" });
		record.followUp = { active: true, pendingTasks: [] };

		// Act
		const lines = presenter.render(record);

		// Assert
		expect(lines).toContain("No thank-you emails pending.");
		expect(lines.join("\n")).not.toMatch(/⏳|✅/);
	});
});
