import { describe, expect, it } from "vitest";
import { episode } from "../testing/attention.fixtures.js";
import {
	AttentionDiagnosticChecklist,
	DIAGNOSTIC_MARKER,
} from "./attention-diagnostic-checklist.js";

describe("diagnostic checklist coverage", () => {
	it("keeps unrelated confirmations actionable", () => {
		// Arrange
		const checklist = new AttentionDiagnosticChecklist();
		checklist.set(
			100,
			`${DIAGNOSTIC_MARKER}\n\n- [ ] **Event Title**: Add a title.`,
		);

		// Act
		const hostCovered = checklist.includes(episode("host-confirmation"));
		const dateCovered = checklist.includes(episode("missing-date"));
		const dataCovered = checklist.includes(episode("required-data"));

		// Assert
		expect(hostCovered).toBe(false);
		expect(dateCovered).toBe(false);
		expect(dataCovered).toBe(true);
	});

	it.each([
		["Communication", "communications"],
		["Slides & Content", "assets"],
		["OpenFeedback Link", "feedback"],
	])(
		"retains a technical failure alongside other %s guidance",
		(field, resource) => {
			// Arrange
			const checklist = new AttentionDiagnosticChecklist();
			const line = `- [ ] **${field}**: Complete this task.`;
			checklist.set(100, `${DIAGNOSTIC_MARKER}\n\n${line}\n${line}`);

			// Act
			const covered = checklist.includes(
				episode("integration-failure", resource),
			);
			const lines = checklist.lines();

			// Assert
			expect(covered).toBe(false);
			expect(lines).toEqual([line]);
		},
	);

	it("does not hide tasks behind a resolved diagnostic comment", () => {
		// Arrange
		const checklist = new AttentionDiagnosticChecklist();
		checklist.set(100, `${DIAGNOSTIC_MARKER}\n\nComplete.`);

		// Act
		const covered = checklist.includes(episode("required-data"));

		// Assert
		expect(covered).toBe(false);
	});
});
