import type { EventDiagnostic } from "@meetup-automation/event";
import {
	type ProposalSnapshot,
	ProposalSourceError,
	ValidateReferentialCatalog,
} from "@meetup-automation/referential";
import { describe, expect, it, vi } from "vitest";
import { event } from "../../testing/meetup-journey.fixtures.js";
import { RefreshSelectedProposals } from "./refresh-selected-proposals.js";

const snapshot: ProposalSnapshot = {
	provider: "conference-hall",
	event: "example-cfp",
	speakers: [],
	proposals: [
		{
			id: "first",
			number: 17,
			title: "Renamed talk",
			abstract: "Public abstract",
			accepted: true,
			formats: ["Talk"],
			languages: ["fr"],
			speakerIds: ["source-one", "source-two"],
		},
		{
			id: "second",
			number: 38,
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
	it.each([
		"event.proposals.invalid-selection",
		"event.document.heading.duplicate",
	])(
		"preserves organizer diagnosis %s without attempting source access",
		async (code) => {
			// Arrange
			const source = { load: vi.fn().mockResolvedValue(snapshot) };
			const diagnostics: EventDiagnostic[] = [
				{
					code,
					severity: "error",
					category: "invalid",
					message: "Synthetic invalid organizer input",
				},
			];
			const committed = await catalog();

			// Act
			const result = await new RefreshSelectedProposals(source).execute(
				{ ...event, proposalReferences: ["17"] },
				committed,
				diagnostics,
			);

			// Assert
			expect(result.proposalStatus).toBe("stale");
			expect(result.agenda).toEqual(event.agenda);
			expect(diagnostics.map((item) => item.code)).toEqual([code]);
			expect(source.load).not.toHaveBeenCalled();
		},
	);

	it("reports malformed provider exports as technical source failures", async () => {
		// Arrange
		const source = {
			load: vi.fn().mockRejectedValue(new ProposalSourceError("invalid")),
		};
		const diagnostics: EventDiagnostic[] = [];
		const committed = await catalog();

		// Act
		const result = await new RefreshSelectedProposals(source).execute(
			{ ...event, proposalReferences: ["17"] },
			committed,
			diagnostics,
		);

		// Assert
		expect(result.proposalStatus).toBe("stale");
		expect(diagnostics.map((item) => item.code)).toEqual([
			"event.proposals.invalid",
		]);
	});

	it("resolves proposal numbers in order, preserving canonical identities and every mapped co-speaker", async () => {
		// Arrange
		const source = { load: vi.fn().mockResolvedValue(snapshot) };
		const diagnostics: EventDiagnostic[] = [];
		const committed = await catalog();

		// Act
		const result = await new RefreshSelectedProposals(source).execute(
			{ ...event, proposalReferences: ["38", "17"] },
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
	it.each([
		["17", "17"],
		["first"],
		["https://other.test/proposals/17"],
		["0"],
		["-17"],
		["1.5"],
		["01"],
		["9007199254740992"],
	])(
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
			expect(diagnostics[0].code).toBe("event.proposals.invalid-selection");
			expect(source.load).not.toHaveBeenCalled();
		},
	);
	it("requires a committed mapping before projecting a speaker", async () => {
		// Arrange
		const source = { load: vi.fn().mockResolvedValue(snapshot) };
		const diagnostics: EventDiagnostic[] = [];

		// Act
		const result = await new RefreshSelectedProposals(source).execute(
			{ ...event, proposalReferences: ["17"] },
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
			{ ...event, proposalReferences: ["17"] },
			committed,
			diagnostics,
		);

		// Assert
		expect(result.proposalStatus).toBe("stale");
		expect(diagnostics[0].code).toBe("event.proposals.rate-limited");
	});
	it("matches the public number even when another proposal has that internal ID", async () => {
		// Arrange
		const source = {
			load: vi.fn().mockResolvedValue({
				...snapshot,
				proposals: [
					{ ...snapshot.proposals[0], id: "38" },
					snapshot.proposals[1],
				],
			}),
		};
		const diagnostics: EventDiagnostic[] = [];
		const committed = await catalog();

		// Act
		const result = await new RefreshSelectedProposals(source).execute(
			{ ...event, proposalReferences: ["38"] },
			committed,
			diagnostics,
		);

		// Assert
		expect(result.proposalStatus).toBe("current");
		expect(result.agenda.map((entry) => entry.proposal?.id)).toEqual([
			"second",
		]);
		expect(diagnostics).toEqual([]);
	});
	it.each([
		["99", snapshot, "not-found"],
		[
			"17",
			{
				...snapshot,
				proposals: [{ ...snapshot.proposals[0], id: "17", number: undefined }],
			},
			"not-found",
		],
		[
			"17",
			{
				...snapshot,
				proposals: [{ ...snapshot.proposals[0], accepted: false }],
			},
			"not-accepted",
		],
		[
			"17",
			{
				...snapshot,
				proposals: [
					...snapshot.proposals,
					{ ...snapshot.proposals[1], number: 17 },
				],
			},
			"conflict",
		],
	] as const)(
		"explains selection failure for %s as %s",
		async (id, data, code) => {
			// Arrange
			const source = { load: vi.fn().mockResolvedValue(data) };
			const diagnostics: EventDiagnostic[] = [
				{
					code: "event.agenda.missing",
					category: "incomplete",
					severity: "warning",
					message: "Missing agenda",
				},
			];
			const committed = await catalog();

			// Act
			const result = await new RefreshSelectedProposals(source).execute(
				{ ...event, proposalReferences: [id] },
				committed,
				diagnostics,
			);

			// Assert
			expect(result.proposalStatus).toBe("stale");
			expect(result.agenda).toEqual(event.agenda);
			expect(diagnostics.map((item) => item.code)).toEqual([
				`event.proposals.${code}`,
			]);
		},
	);
});
