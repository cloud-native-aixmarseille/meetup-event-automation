import { describe, expect, it } from "vitest";
import type { SpeakerCatalogEntry } from "../../domain/speaker-catalog-entry.js";
import type { ProposalSnapshot } from "../ports/proposal-source.js";
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
const linked: SpeakerCatalogEntry = {
	id: "speaker-0007",
	firstName: "Local",
	lastName: "Name",
	displayName: "Old Name",
	company: "Old Company",
	email: "old@example.test",
	phone: "  +33 123  ",
	pictureUrl: "",
	sourceIdentity: {
		provider: "conference-hall",
		event: "example-cfp",
		speakerId: "source-one",
	},
};

describe("MergeSourceSpeakers", () => {
	it("updates owned fields while preserving local IDs, names, phone", () => {
		// Arrange
		const merge = new MergeSourceSpeakers();

		// Act
		const result = merge.execute([linked], snapshot, []);

		// Assert
		expect(result.entries[0]).toEqual({
			...linked,
			displayName: "New Name",
			email: "new@example.test",
			company: "New Company",
			pictureUrl: "https://example.test/new.png",
		});
		expect(result.reservedIds).toContain("speaker-0007");
	});
	it("reserves removed IDs and reuses allocations from the previous candidate", () => {
		// Arrange
		const merge = new MergeSourceSpeakers();
		const state = ["speaker-0020"];

		// Act
		const first = merge.execute([], snapshot, state);
		const retry = merge.execute(first.entries, snapshot, first.reservedIds);

		// Assert
		expect(first.entries[0].id).toBe("speaker-0021");
		expect(retry).toEqual(first);
	});
	it("retains unlinked and disappeared records", () => {
		// Arrange
		const local: SpeakerCatalogEntry = {
			firstName: "",
			lastName: "",
			company: "",
			pictureUrl: "",
			id: "speaker-0008",
			displayName: "Local Person",
			email: "local@example.test",
			phone: "local phone",
		};

		// Act
		const result = new MergeSourceSpeakers().execute(
			[linked, local],
			{ ...snapshot, speakers: [] },
			[],
		);

		// Assert
		expect(result.entries).toEqual([linked, local]);
	});
	it("requires reviewed identity mapping when an unlinked row is a possible match", () => {
		// Arrange
		const local: SpeakerCatalogEntry = {
			firstName: "",
			lastName: "",
			company: "",
			pictureUrl: "",
			id: "speaker-0001",
			displayName: "New Name",
			email: "new@example.test",
			phone: "private",
		};

		// Act
		const merge = () =>
			new MergeSourceSpeakers().execute([local], snapshot, []);

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
			[{ ...linked, pictureUrl: "https://example.test/old.png" }],
			{ ...snapshot, speakers: [profile] },
			[],
		);

		// Assert
		expect(result.entries[0].company).toBe("");
		expect(result.entries[0].pictureUrl).toBe("");
	});
	it("rejects conflicting source mappings", () => {
		// Arrange
		const rows = [linked, { ...linked, id: "speaker-0009" }];

		// Act
		const merge = () => new MergeSourceSpeakers().execute(rows, snapshot, []);

		// Assert
		expect(merge).toThrow("Proposal source conflict.");
	});
});
