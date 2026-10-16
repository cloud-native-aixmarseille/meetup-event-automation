import { describe, expect, it, vi } from "vitest";
import type { EventDiagnostic } from "@meetup-automation/event";
import {
	ProposalSourceError,
	type ProposalSnapshot,
	ValidateReferentialCatalog,
} from "@meetup-automation/referential";
import { event } from "../../testing/meetup-journey.fixtures.js";
import { RefreshSelectedProposals } from "./refresh-selected-proposals.js";

const snapshot: ProposalSnapshot = {
	provider: "conference-hall",
	event: "example-cfp",
	speakers: [],
	proposals: [
		{
			id: "first",
			title: "Renamed talk",
			abstract: "Public abstract",
			accepted: true,
			formats: ["Talk"],
			languages: ["fr"],
			speakerIds: ["source-one", "source-two"],
		},
		{
			id: "second",
			title: "Second talk",
			abstract: "Second abstract",
			accepted: true,
			formats: [],
			languages: [],
			speakerIds: ["source-one"],
		},
	],
};

async function catalog() {
	const result = await new ValidateReferentialCatalog().execute({
		hosts: [],
		speakers: ["source-one", "source-two"].map((sourceSpeakerId, index) => ({
			speakerId: `speaker-000${index + 1}`,
			firstName: "",
			lastName: "",
			company: "",
			displayName: "Same Name",
			email: `person${index}@example.test`,
			sourceProvider: "conference-hall",
			sourceEvent: "example-cfp",
			sourceSpeakerId,
		})),
	});
	if (!result.isValid) throw new Error("Invalid synthetic catalog");
	return result.catalog;
}

describe("RefreshSelectedProposals", () => {
	it("uses explicit order and every mapped co-speaker, including equal display names", async () => {
		// Arrange
		const source = { load: vi.fn().mockResolvedValue(snapshot) };
		const diagnostics: EventDiagnostic[] = [];
		const committed = await catalog();
		// Act
		const result = await new RefreshSelectedProposals(source).execute(
			{ ...event, proposalReferences: ["second", "first"] },
			committed,
			diagnostics,
		);
		// Assert
		expect(result.proposalStatus).toBe("current");
		expect(result.agenda.map((entry) => entry.proposal?.id)).toEqual([
			"second",
			"first",
		]);
		expect(result.agenda[1].speakers.map((speaker) => speaker.id)).toEqual([
			"speaker-0001",
			"speaker-0002",
		]);
		expect(result.confirmations).toEqual(event.confirmations);
		expect(diagnostics).toEqual([]);
	});
	it.each([["first", "first"], ["foreign"], ["https://other.test"]])(
		"keeps the last agenda stale for invalid selection %j",
		async (...proposalReferences) => {
			// Arrange
			const diagnostics: EventDiagnostic[] = [];
			const committed = await catalog();
			const source = { load: vi.fn().mockResolvedValue(snapshot) };
			// Act
			const result = await new RefreshSelectedProposals(source).execute(
				{ ...event, proposalReferences },
				committed,
				diagnostics,
			);
			// Assert
			expect(result.proposalStatus).toBe("stale");
			expect(result.agenda).toEqual(event.agenda);
			expect(diagnostics[0].code).toBe("event.proposals.invalid");
		},
	);
	it("requires a committed mapping before projecting a speaker", async () => {
		// Arrange
		const source = { load: vi.fn().mockResolvedValue(snapshot) };
		const diagnostics: EventDiagnostic[] = [];
		// Act
		const result = await new RefreshSelectedProposals(source).execute(
			{ ...event, proposalReferences: ["first"] },
			{ hosts: [], speakers: [] },
			diagnostics,
		);
		// Assert
		expect(result.agenda).toEqual(event.agenda);
		expect(result.proposalStatus).toBe("stale");
		expect(diagnostics[0].code).toBe("event.proposals.mapping-required");
	});
	it("keeps failed source details out of organizer diagnostics", async () => {
		// Arrange
		const source = {
			load: vi
				.fn()
				.mockRejectedValue(new ProposalSourceError("rate-limited", 60)),
		};
		const diagnostics: EventDiagnostic[] = [];
		const committed = await catalog();
		// Act
		const result = await new RefreshSelectedProposals(source).execute(
			{ ...event, proposalReferences: ["first"] },
			committed,
			diagnostics,
		);
		// Assert
		expect(result.proposalStatus).toBe("stale");
		expect(diagnostics[0].code).toBe("event.proposals.rate-limited");
	});
});
