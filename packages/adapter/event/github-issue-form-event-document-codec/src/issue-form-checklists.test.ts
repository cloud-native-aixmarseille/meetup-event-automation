import { EventDomainComposition } from "@meetup-automation/event";
import { describe, expect, it } from "vitest";
import { GithubIssueFormEventDocumentCodecComposition } from "./dependency-composition.js";
import { IssueFormChecklists } from "./issue-form-checklists.js";
import { MarkdownLines } from "./markdown-lines.js";

function checklists() {
	return new IssueFormChecklists({
		eventDiagnostics: new EventDomainComposition().eventDiagnostics(),
		issueFormSections:
			new GithubIssueFormEventDocumentCodecComposition().issueFormSections(),
		markdownLines: new MarkdownLines(),
	});
}

describe("issue checklist completion", () => {
	it.each([
		"Mail introduction hoster",
		"Mail introduction speakers",
		"Mail thanks hoster",
		"Mail thanks speakers",
		"Share slides to meetup",
		"Meetup event published",
		"Slack - AixMarseille.Tech",
		"Slack - OpenBaR",
		"LinkedIn",
	])("renders completed %s without a clickable checkbox", (name) => {
		// Arrange
		const codec = checklists();
		const body = `### Communication\n\n- [ ] ${name}`;

		// Act
		const result = codec.renderOperationalChecklist(
			[{ name, completed: true }],
			body,
			"Communication",
		);

		// Assert
		expect(result).toBe(`✅ ${name}`);
	});

	it("keeps pending actions and manual tasks as checkboxes", () => {
		// Arrange
		const codec = checklists();
		const tasks = [
			{ name: "LinkedIn", completed: false },
			{ name: "Social networks", completed: true },
			{ name: "Sync attendees from tally sheet to CNCF", completed: true },
			{ name: "Prepare name badges", completed: false },
		];

		// Act
		const result = codec.renderOperationalChecklist(tasks, "", "Post event");

		// Assert
		expect(result).toBe(
			"- [ ] LinkedIn\n- [x] Social networks\n- [x] Sync attendees from tally sheet to CNCF\n- [ ] Prepare name badges",
		);
	});

	it("preserves a section with a malformed completion marker", () => {
		// Arrange
		const codec = checklists();
		const body = "### Communication\n\n✅\n- [ ] LinkedIn\n";

		// Act
		const result = codec.replaceOrAppendChecklistSections(
			body,
			["Communication"],
			[{ name: "LinkedIn", completed: true }],
		);

		// Assert
		expect(result).toBe(body);
	});
});
