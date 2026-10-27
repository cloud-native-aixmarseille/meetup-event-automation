import { describe, expect, it } from "vitest";
import {
	DiagnosticCommentSections,
	SOCIAL_DIAGNOSTIC_END,
	SOCIAL_DIAGNOSTIC_START,
} from "./diagnostic-comment-sections.js";
import { EVENT_DIAGNOSTIC_COMMENT_MARKER } from "./github-event-comment-repository-contracts.js";

const baseTask = "- [ ] **Event Date**: Set the event date.";
const socialTask =
	"- [ ] **Social publication (community, announcement)**: Approve publication.";
const prefix = EVENT_DIAGNOSTIC_COMMENT_MARKER;

describe("independent diagnostic checklist sections", () => {
	it("adds social work without resolving the independently evaluated base checklist", () => {
		// Arrange
		const sections = new DiagnosticCommentSections();

		// Act
		const body = sections.merge(
			`${prefix}\n\n${baseTask}`,
			`${prefix}\n\n${socialTask}`,
			"social",
		);

		// Assert
		expect(body).toContain(baseTask);
		expect(body).toContain(
			`${SOCIAL_DIAGNOSTIC_START}\n${socialTask}\n${SOCIAL_DIAGNOSTIC_END}`,
		);
		expect(body.split(prefix)).toHaveLength(2);
	});
	it("preserves unresolved social work when all base tasks resolve", () => {
		// Arrange
		const sections = new DiagnosticCommentSections();
		const previous = `${prefix}\n${baseTask}\n${SOCIAL_DIAGNOSTIC_START}\n${socialTask}\n${SOCIAL_DIAGNOSTIC_END}`;

		// Act
		const body = sections.merge(previous, `${prefix}\n\nAll checks resolved.`);

		// Assert
		expect(body).toContain(socialTask);
		expect(body).not.toContain(baseTask);
		expect(body).not.toContain("All checks resolved.");
	});
	it("clears only social tasks after a complete social evaluation", () => {
		// Arrange
		const sections = new DiagnosticCommentSections();
		const previous = `${prefix}\n${baseTask}\n${SOCIAL_DIAGNOSTIC_START}\n${socialTask}\n${SOCIAL_DIAGNOSTIC_END}`;

		// Act
		const body = sections.merge(
			previous,
			`${prefix}\n\nAll checks resolved.`,
			"social",
		);

		// Assert
		expect(body).toContain(baseTask);
		expect(body).not.toContain(socialTask);
		expect(body).not.toContain("All checks resolved.");
	});
	it.each([
		`${SOCIAL_DIAGNOSTIC_START}\n${socialTask}`,
		`${SOCIAL_DIAGNOSTIC_START}\n${SOCIAL_DIAGNOSTIC_START}\n${SOCIAL_DIAGNOSTIC_END}`,
		"<!-- meetup-automation:social-diagnostics:v99 -->",
	])(
		"rejects malformed existing scoped state rather than silently dropping it",
		(previous) => {
			// Arrange
			const sections = new DiagnosticCommentSections();

			// Act
			const merge = () => sections.merge(previous, prefix);

			// Assert
			expect(merge).toThrow("Invalid social diagnostic section");
		},
	);
});
