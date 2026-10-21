import { describe, expect, it, vi } from "vitest";
import {
	GitHubIssueFormEventDocumentCodec,
	GithubIssueFormEventDocumentCodecComposition,
} from "../packages/adapter/github-issue-form-event-document-codec/src/index.js";
import {
	JourneyComposition,
	JourneyPolicyComposition,
	ManageMeetupEvent,
} from "../packages/application/journey/src/index.js";
import {
	catalog,
	config,
} from "../packages/application/journey/testing/meetup-journey.fixtures.js";
import type { EventDocument } from "../packages/domain/event/src/index.js";
import { EventDomainComposition } from "../packages/domain/event/src/index.js";
import type { ProposalSnapshot } from "../packages/domain/referential/src/index.js";
import { ReferentialDomainComposition } from "../packages/domain/referential/src/index.js";

const document: EventDocument = {
	identity: { repository: "example/meetups", issueNumber: 42 },
	issueState: "open",
	issueTitle: "[Meetup]",
	labels: ["meetup", "hoster:confirmed", "speakers:confirmed"],
	body: `### Event Title

Platform Night

### Event Date

2026-11-05

### Hoster

Example Host

### Event Description

An evening about platforms.

### Conference Hall proposals

17

### Organizer notes

Keep this note.
`,
};

const snapshot: ProposalSnapshot = {
	provider: "conference-hall",
	event: "example-cfp",
	speakers: [],
	proposals: [
		{
			id: "proposal-one",
			number: 17,
			title: "Reliable platforms",
			abstract: "A public abstract",
			accepted: true,
			formats: [],
			languages: [],
			speakerIds: ["source-one"],
		},
	],
};

function fixture(sourceDocument = document) {
	const repository = {
		find: vi.fn().mockResolvedValue(sourceDocument),
		applyPatch: vi.fn(),
		listPage: vi.fn(),
	};
	const proposalSource = { load: vi.fn().mockResolvedValue(snapshot) };
	const useCase = new ManageMeetupEvent(
		{
			eventPublicationEvaluation:
				new JourneyPolicyComposition().eventPublicationEvaluation(),
			eventReadinessPolicy: new EventDomainComposition().eventReadinessPolicy(),
			eventLifecycle: new EventDomainComposition().eventLifecycle(),
			eventDiagnosticProjection:
				new JourneyPolicyComposition().eventDiagnosticProjection(),
			eventParticipantResolution:
				new JourneyPolicyComposition().eventParticipantResolution(),
			eventRepositoryPatches:
				new EventDomainComposition().eventRepositoryPatches(),
			eventDocumentConcurrency:
				new EventDomainComposition().eventDocumentConcurrency(),
			createReconcileEvent: (...args) =>
				new EventDomainComposition().reconcileEvent(...args),
			createValidateReferentialCatalog: (...args) =>
				new ReferentialDomainComposition().validateReferentialCatalog(...args),
			createRefreshSelectedProposals: (...args) =>
				new JourneyComposition().refreshSelectedProposals(...args),
			createResolveEventReferences: (...args) =>
				new ReferentialDomainComposition().resolveEventReferences(...args),
		},
		{
			config,
			proposalSource,
			referentialRepository: {
				load: vi.fn().mockResolvedValue({
					...catalog,
					speakers: [
						{
							...catalog.speakers[0],
							sourceProvider: "conference-hall",
							sourceEvent: "example-cfp",
							sourceSpeakerId: "source-one",
						},
					],
				}),
			},
			eventDependencies: {
				repository,
				documentCodec: new GitHubIssueFormEventDocumentCodec({
					createIssueFormReader: (...args) =>
						new GithubIssueFormEventDocumentCodecComposition().issueFormReader(
							...args,
						),
					createIssueFormWriter: (...args) =>
						new GithubIssueFormEventDocumentCodecComposition().issueFormWriter(
							...args,
						),
				}),
				clock: { now: () => "2026-10-01T12:00:00Z" },
			},
		},
	);
	return { useCase, repository, proposalSource };
}

describe("Conference Hall agenda generation", () => {
	it("creates an agenda from proposal selection alone and refreshes later talk edits", async () => {
		// Arrange
		const { useCase, repository, proposalSource } = fixture();
		const input = { identity: document.identity, mode: "fix" as const };

		// Act
		const first = await useCase.execute(input);
		const firstPatch = repository.applyPatch.mock.calls[0][1];
		const updated = { ...document, ...firstPatch };
		repository.find.mockResolvedValue(updated);
		proposalSource.load.mockResolvedValue({
			...snapshot,
			proposals: [{ ...snapshot.proposals[0], title: "Updated platforms" }],
		});
		const refreshed = await useCase.execute(input);
		const refreshPatch = repository.applyPatch.mock.calls[1][1];

		// Assert
		expect(first.skipped).toBe(false);
		if (first.skipped || refreshed.skipped)
			throw new Error("Expected meetup reconciliation");
		expect(first.event.proposalStatus).toBe("current");
		expect(first.event.agenda[0]).toMatchObject({
			description: "Reliable platforms: A public abstract",
			proposal: { id: "proposal-one" },
			speakers: [{ id: "speaker-0001", displayName: "Example Speaker" }],
		});
		expect(first.diagnostics).not.toContainEqual(
			expect.objectContaining({ code: "event.document.heading.missing" }),
		);
		expect(firstPatch.body).toContain("### Agenda");
		expect(firstPatch.body).toContain("### Conference Hall proposals\n\n17");
		expect(firstPatch.body).toContain("### Organizer notes\n\nKeep this note.");
		expect(firstPatch.body).not.toContain("speaker@example.test");
		expect(refreshed.event.proposalStatus).toBe("current");
		expect(refreshed.event.agenda[0].description).toBe(
			"Updated platforms: A public abstract",
		);
		expect(refreshPatch.body).toContain("Updated platforms");
		expect(refreshPatch.body).not.toContain("Reliable platforms");
	});

	it("keeps an empty proposal selection incomplete without requiring a manual agenda", async () => {
		// Arrange
		const source = {
			...document,
			body: document.body.replace("\n\n17\n", "\n\n_No response_\n"),
		};
		const { useCase, proposalSource } = fixture(source);

		// Act
		const result = await useCase.execute({
			identity: source.identity,
			mode: "check",
		});

		// Assert
		expect(result.skipped).toBe(false);
		if (result.skipped) throw new Error("Expected meetup reconciliation");
		expect(result.isReady).toBe(false);
		expect(result.event.agenda).toEqual([]);
		expect(result.diagnostics).not.toContainEqual(
			expect.objectContaining({ code: "event.document.heading.missing" }),
		);
		expect(proposalSource.load).not.toHaveBeenCalled();
	});
});
