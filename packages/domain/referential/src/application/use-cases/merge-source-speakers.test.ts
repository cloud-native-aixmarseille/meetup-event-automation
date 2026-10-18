import { describe, expect, it } from "vitest";
import type {
	ProposalSnapshot,
	SpeakerCsvRow,
} from "../ports/proposal-source.js";
import { MergeSourceSpeakers } from "./merge-source-speakers.js";

const snapshot: ProposalSnapshot = {
	provider: "conference-hall",
	event: "example-cfp",
	speakers: [
		{
			id: "source-one",
			displayName: "New Name",
			email: "new@example.test",
			company: "New Company",
			pictureUrl: "https://example.test/new.png",
		},
	],
	proposals: [],
};
const linked: SpeakerCsvRow = {
	speaker_id: "speaker-0007",
	firstname: "Local",
	lastname: "Name",
	display_name: "Old Name",
	company: "Old Company",
	mail: "old@example.test",
	phone: "  +33 123  ",
	notes: "Private, local\nnotes",
	source_provider: "conference-hall",
	source_event: "example-cfp",
	source_speaker_id: "source-one",
};

describe("MergeSourceSpeakers", () => {
	it("updates owned fields while preserving local IDs, names, phone and extra columns", () => {
		// Arrange
		const merge = new MergeSourceSpeakers();
		// Act
		const result = merge.execute([linked], snapshot, {
			version: 1,
			reservedIds: [],
		});
		// Assert
		expect(result.rows[0]).toEqual({
			...linked,
			display_name: "New Name",
			mail: "new@example.test",
			company: "New Company",
			picture_url: "https://example.test/new.png",
		});
		expect(result.state.reservedIds).toContain("speaker-0007");
	});
	it("reserves removed IDs and reuses allocations from the previous candidate", () => {
		// Arrange
		const merge = new MergeSourceSpeakers();
		const state = { version: 1 as const, reservedIds: ["speaker-0020"] };
		// Act
		const first = merge.execute([], snapshot, state);
		const retry = merge.execute(first.rows, snapshot, first.state);
		// Assert
		expect(first.rows[0].speaker_id).toBe("speaker-0021");
		expect(retry).toEqual(first);
	});
	it("retains unlinked and disappeared records", () => {
		// Arrange
		const local = {
			speaker_id: "speaker-0008",
			display_name: "Local Person",
			mail: "local@example.test",
			phone: "local phone",
		};
		// Act
		const result = new MergeSourceSpeakers().execute(
			[linked, local],
			{ ...snapshot, speakers: [] },
			{ version: 1, reservedIds: [] },
		);
		// Assert
		expect(result.rows).toEqual([linked, local]);
	});
	it("requires reviewed identity mapping when an unlinked row is a possible match", () => {
		// Arrange
		const local = {
			speaker_id: "speaker-0001",
			display_name: "New Name",
			mail: "new@example.test",
			phone: "private",
		};
		// Act
		const merge = () =>
			new MergeSourceSpeakers().execute([local], snapshot, {
				version: 1,
				reservedIds: [],
			});
		// Assert
		expect(merge).toThrow(
			expect.objectContaining({
				code: "mapping-required",
				context: { field: "speakers[0]" },
			}),
		);
	});
	it("clears missing source-owned affiliation and explicitly removed pictures", () => {
		// Arrange
		const profile = {
			id: "source-one",
			displayName: "New Name",
			email: "new@example.test",
			pictureUrl: null,
		};
		// Act
		const result = new MergeSourceSpeakers().execute(
			[{ ...linked, picture_url: "https://example.test/old.png" }],
			{ ...snapshot, speakers: [profile] },
			{ version: 1, reservedIds: [] },
		);
		// Assert
		expect(result.rows[0].company).toBe("");
		expect(result.rows[0].picture_url).toBe("");
	});
	it("rejects conflicting source mappings", () => {
		// Arrange
		const rows = [linked, { ...linked, speaker_id: "speaker-0009" }];
		// Act
		const merge = () =>
			new MergeSourceSpeakers().execute(rows, snapshot, {
				version: 1,
				reservedIds: [],
			});
		// Assert
		expect(merge).toThrow("Proposal source conflict.");
	});
});
