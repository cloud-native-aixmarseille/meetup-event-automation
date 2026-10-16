import { describe, expect, it } from "vitest";
import type { EventDiagnostic } from "@meetup-automation/event";
import { ProposalSelectionCodec } from "./proposal-selection-codec.js";

describe("ProposalSelectionCodec", () => {
	it("reads explicitly ordered IDs while requiring a fresh source check", () => {
		// Arrange
		const body =
			"<!-- meetup-proposals:1:current -->\n### Conference Hall proposals\n\nsecond\nfirst\n";
		const diagnostics: EventDiagnostic[] = [];
		// Act
		const result = ProposalSelectionCodec.read(body, diagnostics);
		// Assert
		expect(result).toEqual({
			proposalReferences: ["second", "first"],
			proposalStatus: "stale" as const,
		});
		expect(diagnostics).toEqual([]);
	});
	it("does not opt legacy issues into management", () => {
		// Arrange
		const diagnostics: EventDiagnostic[] = [];
		// Act
		const result = ProposalSelectionCodec.read(
			"### Agenda\n\n- Alex: Talk",
			diagnostics,
		);
		// Assert
		expect(result).toEqual({});
	});
	it("preserves unrelated text when marking a projection stale", () => {
		// Arrange
		const body =
			"<!-- meetup-proposals:1:current -->\n### Organizer notes\n\nKeep these notes\n";
		const event = {
			proposalReferences: ["first"],
			proposalStatus: "stale" as const,
		};
		// Act
		const result = ProposalSelectionCodec.write(body, event);
		// Assert
		expect(result).toBe(body.replace("1:current", "1:stale"));
	});
	it("escapes imported markup and new headings", () => {
		// Arrange
		const text =
			"<script>\n### Agenda\n[link](javascript:alert(1)) <!-- injected -->";
		// Act
		const result = ProposalSelectionCodec.escape(text);
		// Assert
		expect(result).not.toMatch(/<|\n|\[|###/g);
		expect(result).toContain("&lt;script&gt;");
	});
});
