import type { EventDiagnostic } from "@meetup-automation/event";
import { describe, expect, it } from "vitest";
import { GithubIssueFormEventDocumentCodecComposition } from "./dependency-composition.js";
import { ProposalSelectionCodec } from "./proposal-selection-codec.js";

describe("ProposalSelectionCodec", () => {
	it("renders ordered talk links that remain editable as plain IDs", () => {
		// Arrange
		const codec =
			new GithubIssueFormEventDocumentCodecComposition().proposalSelectionCodec();
		const body =
			"### Conference Hall proposals\n\n38\n17\n\n### Organizer notes\n\nKeep these notes\n";
		const event = {
			proposalReferences: ["38", "17"],
			proposalStatus: "current" as const,
		};
		const url = "https://conference-hall.io/team/example-team/example-cfp";
		const diagnostics: EventDiagnostic[] = [];
		// Act
		const written = codec.write(body, event, url);
		const read = codec.read(written, diagnostics);
		const repeated = codec.write(written, event, url);
		const edited = codec.read(
			written.replace(`[38](${url}/proposals/38)`, "42"),
			diagnostics,
		);
		// Assert
		expect(written).toContain(
			`[38](${url}/proposals/38)\n[17](${url}/proposals/17)`,
		);
		expect(written).toContain("### Organizer notes\n\nKeep these notes");
		expect(read.proposalReferences).toEqual(["38", "17"]);
		expect(read.proposalStatus).toBe("stale");
		expect(repeated).toBe(written);
		expect(edited.proposalReferences).toEqual(["42", "17"]);
		expect(diagnostics).toEqual([]);
	});
	it.each([
		"[17](https://example.test/team/example-team/example-cfp/proposals/17)",
		"[17](https://conference-hall.io/team/example-team/example-cfp/proposals/38)",
		"[17](https://conference-hall.io/team/example-team/example-cfp/proposals/17?unsafe=1)",
	])(
		"leaves invalid or mismatched link input visible for validation: %s",
		(selection) => {
			// Arrange
			const codec =
				new GithubIssueFormEventDocumentCodecComposition().proposalSelectionCodec();
			// Act
			const read = codec.read(
				`### Conference Hall proposals\n\n${selection}\n`,
				[],
			);
			// Assert
			expect(read.proposalReferences).toEqual([selection]);
		},
	);
	it("preserves the selected links when source refresh fails", () => {
		// Arrange
		const codec =
			new GithubIssueFormEventDocumentCodecComposition().proposalSelectionCodec();
		const body =
			"<!-- meetup-proposals:1:current -->\n### Conference Hall proposals\n\n[17](https://conference-hall.io/team/example-team/example-cfp/proposals/17)\n";
		// Act
		const written = codec.write(
			body,
			{ proposalReferences: ["17"], proposalStatus: "stale" },
			"https://conference-hall.io/team/changed-team/example-cfp",
		);
		// Assert
		expect(written).toBe(body.replace("1:current", "1:stale"));
	});

	it.each([
		"<!-- meetup-proposals:unsupported -->",
		"<!-- meetup-proposals:1:stale -->\n<!-- meetup-proposals:1:current -->",
	])(
		"reports malformed selection metadata as organizer input: %s",
		(marker) => {
			// Arrange
			const diagnostics: EventDiagnostic[] = [];
			const body = `${marker}\n### Conference Hall proposals\n\n17\n`;

			// Act
			const result = new ProposalSelectionCodec({
				issueFormSections:
					new GithubIssueFormEventDocumentCodecComposition().issueFormSections(),
				managedIssueMarkers:
					new GithubIssueFormEventDocumentCodecComposition().managedIssueMarkers(),
			}).read(body, diagnostics);

			// Assert
			expect(result.proposalStatus).toBe("stale");
			expect(diagnostics).toContainEqual(
				expect.objectContaining({
					code: "event.proposals.invalid-selection",
				}),
			);
		},
	);

	it("reads explicitly ordered proposal numbers while requiring a fresh source check", () => {
		// Arrange
		const body =
			"<!-- meetup-proposals:1:current -->\n### Conference Hall proposals\n\n38\n17\n";
		const diagnostics: EventDiagnostic[] = [];

		// Act
		const result = new ProposalSelectionCodec({
			issueFormSections:
				new GithubIssueFormEventDocumentCodecComposition().issueFormSections(),
			managedIssueMarkers:
				new GithubIssueFormEventDocumentCodecComposition().managedIssueMarkers(),
		}).read(body, diagnostics);

		// Assert
		expect(result).toEqual({
			proposalReferences: ["38", "17"],
			proposalStatus: "stale" as const,
		});
		expect(diagnostics).toEqual([]);
	});
	it("does not opt legacy issues into management", () => {
		// Arrange
		const diagnostics: EventDiagnostic[] = [];

		// Act
		const result = new ProposalSelectionCodec({
			issueFormSections:
				new GithubIssueFormEventDocumentCodecComposition().issueFormSections(),
			managedIssueMarkers:
				new GithubIssueFormEventDocumentCodecComposition().managedIssueMarkers(),
		}).read("### Agenda\n\n- Alex: Talk", diagnostics);

		// Assert
		expect(result).toEqual({});
	});
	it("preserves unrelated text when marking a projection stale", () => {
		// Arrange
		const body =
			"<!-- meetup-proposals:1:current -->\n### Organizer notes\n\nKeep these notes\n";
		const event = {
			proposalReferences: ["17"],
			proposalStatus: "stale" as const,
		};

		// Act
		const result = new ProposalSelectionCodec({
			issueFormSections:
				new GithubIssueFormEventDocumentCodecComposition().issueFormSections(),
			managedIssueMarkers:
				new GithubIssueFormEventDocumentCodecComposition().managedIssueMarkers(),
		}).write(body, event);

		// Assert
		expect(result).toBe(body.replace("1:current", "1:stale"));
	});
	it("escapes imported markup and new headings", () => {
		// Arrange
		const text =
			"<script>\n### Agenda\n[link](javascript:alert(1)) <!-- injected -->";

		// Act
		const result = new ProposalSelectionCodec({
			issueFormSections:
				new GithubIssueFormEventDocumentCodecComposition().issueFormSections(),
			managedIssueMarkers:
				new GithubIssueFormEventDocumentCodecComposition().managedIssueMarkers(),
		}).escape(text);

		// Assert
		expect(result).not.toMatch(/<|\n|\[|###/g);
		expect(result).toContain("&lt;script&gt;");
	});
});
