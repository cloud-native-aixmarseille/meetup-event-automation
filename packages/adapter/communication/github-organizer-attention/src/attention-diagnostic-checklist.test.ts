import { describe, expect, it } from "vitest";
import {
	AttentionDiagnosticChecklist,
	DIAGNOSTIC_MARKER,
} from "./attention-diagnostic-checklist.js";
import { GithubOrganizerAttentionComposition } from "./dependency-composition.js";

describe("diagnostic checklist decoding", () => {
	it("decodes public headings and removes duplicate lines", () => {
		// Arrange
		const checklist = new AttentionDiagnosticChecklist({
			createAttentionMessages: (...args) =>
				new GithubOrganizerAttentionComposition().attentionMessages(...args),
		});
		const line = "- [ ] **Event Date**: Set the event date.";

		// Act
		checklist.set(100, `${DIAGNOSTIC_MARKER}\n\n${line}\n${line}`);
		const decoded = checklist.read();

		// Assert
		expect(decoded).toEqual({
			commentId: 100,
			entries: [
				{
					field: "date",
					label: "Event Date",
					description: "Set the event date.",
					action: undefined,
				},
			],
		});
	});
	it.each([
		["Approve or reject Meetup publication.", "meetup-approval"],
		["Approuvez ou refusez le lot de courriels.", "email-approval"],
		["Verify delivery before retrying.", "delivery-recovery"],
	])(
		"recognizes existing localized public action %s",
		(description, action) => {
			// Arrange
			const checklist = new AttentionDiagnosticChecklist({
				createAttentionMessages: (...args) =>
					new GithubOrganizerAttentionComposition().attentionMessages(...args),
			});

			// Act
			checklist.set(
				100,
				`${DIAGNOSTIC_MARKER}\n\n- [ ] **Communication**: ${description}`,
			);
			const decoded = checklist.read();

			// Assert
			expect(decoded.entries[0].action).toBe(action);
		},
	);
	it("excludes stored attention details from the diagnostic source", () => {
		// Arrange
		const checklist = new AttentionDiagnosticChecklist({
			createAttentionMessages: (...args) =>
				new GithubOrganizerAttentionComposition().attentionMessages(...args),
		});

		// Act
		checklist.set(
			100,
			`${DIAGNOSTIC_MARKER}\n\nComplete.\n\n<!-- meetup-organizer-attention:v1 {} -->\n- [ ] **Communication**: Private suffix`,
		);
		const decoded = checklist.read();
		const prefix = checklist.prefix();

		// Assert
		expect(decoded.entries).toEqual([]);
		expect(prefix).toBe(`${DIAGNOSTIC_MARKER}\n\nComplete.`);
	});
});
