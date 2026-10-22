import type { EventDocument, MeetupEvent } from "@meetup-automation/event";
import { EventDomainComposition } from "@meetup-automation/event";
import {
	type FeedbackEventGateway,
	FeedbackResolutionError,
	PublicationDomainComposition,
} from "@meetup-automation/publication";
import {
	ProposalSourceError,
	ReferentialDomainComposition,
	type ReferentialRepository,
} from "@meetup-automation/referential";
import { describe, expect, it, vi } from "vitest";
import {
	catalog,
	config,
	createEventDependencies,
	createPublicationUrlPolicyEngine,
	event,
	identity,
	sourceDocument,
} from "../../testing/meetup-journey.fixtures.js";
import { JourneyComposition } from "../dependency-composition.js";
import { JourneyPolicyComposition } from "../policy-composition.js";
import { ManageMeetupEvent } from "./manage-meetup-event.js";
import { ReconcileMeetupFeedback } from "./reconcile-meetup-feedback.js";

const feedbackAgenda = {
	talks: [
		{
			title: "Reliable platforms",
			speakers: [{ id: "speaker-0001", name: "Example Speaker" }],
		},
	],
};

const feedbackUrl = "https://openfeedback.io/example-poll";
function journey(
	overrides: Partial<MeetupEvent> = {},
	referentialRepository: ReferentialRepository = { load: async () => catalog },
) {
	const deps = createEventDependencies();
	let current: EventDocument = sourceDocument;
	let currentEvent: MeetupEvent = {
		...event,
		publicationLinks: { ...event.publicationLinks, feedback: feedbackUrl },
		...overrides,
	};
	let pendingEvent = currentEvent;
	vi.mocked(deps.repository.find).mockImplementation(async () => current);
	vi.mocked(deps.repository.applyPatch).mockImplementation(async (_, patch) => {
		current = { ...current, ...patch };
		currentEvent = pendingEvent;
	});
	vi.mocked(deps.repository.listPage).mockResolvedValue({ items: [] });
	vi.mocked(deps.documentCodec.decode).mockImplementation(() => ({
		event: currentEvent,
		diagnostics: [],
	}));
	vi.mocked(deps.documentCodec.createPatch).mockImplementation((_, updated) => {
		pendingEvent = updated;
		return { body: "normalized feedback URL" };
	});
	const events = {
		ensureEvent: vi
			.fn<FeedbackEventGateway["ensureEvent"]>()
			.mockResolvedValue(feedbackUrl),
	};
	const useCase = new ReconcileMeetupFeedback(
		{
			feedbackPolicy: new PublicationDomainComposition().feedbackPolicy(),
			feedbackAgendaProjection:
				new JourneyPolicyComposition().feedbackAgendaProjection(),
			eventRepositoryPatches:
				new EventDomainComposition().eventRepositoryPatches(),
			eventDocumentConcurrency:
				new EventDomainComposition().eventDocumentConcurrency(),
		},
		{
			eventRepository: deps.repository,
			documentCodec: deps.documentCodec,
			events,
			manageEvent: new ManageMeetupEvent(
				{
					eventPublicationEvaluation:
						new JourneyPolicyComposition().eventPublicationEvaluation(
							createPublicationUrlPolicyEngine(),
						),
					eventReadinessPolicy:
						new EventDomainComposition().eventReadinessPolicy(),
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
						new ReferentialDomainComposition().validateReferentialCatalog(
							...args,
						),
					createRefreshSelectedProposals: (...args) =>
						new JourneyComposition().refreshSelectedProposals(...args),
					resolveEventReferences:
						new ReferentialDomainComposition().resolveEventReferences(),
				},
				{
					proposalSource: { load: vi.fn() },
					config,
					eventDependencies: deps,
					referentialRepository,
				},
			),
		},
	);
	return { deps, events, useCase };
}

describe("meetup feedback journey", () => {
	it("reports conflicting feedback identities without updating the issue", async () => {
		// Arrange
		const { deps, events, useCase } = journey();
		const error = new FeedbackResolutionError("conflict");
		error.message = "private provider contents";
		events.ensureEvent.mockRejectedValue(error);

		// Act
		const result = await useCase.execute({ identity });

		// Assert
		expect(result).toMatchObject({
			skipped: true,
			persisted: false,
			diagnostics: [
				{
					code: "publication.feedback.conflict",
					severity: "warning",
				},
			],
		});
		expect(JSON.stringify(result)).not.toContain("private provider contents");
		expect(deps.repository.applyPatch).not.toHaveBeenCalled();
	});
	it("keeps feedback unchanged when live profiles cannot be refreshed, including a manual agenda", async () => {
		// Arrange
		const { useCase, events } = journey(
			{},
			{
				load: async () => {
					throw new ProposalSourceError("unavailable");
				},
			},
		);

		// Act
		const result = await useCase.execute({ identity });

		// Assert
		expect(result).toMatchObject({
			skipped: true,
			persisted: false,
		});
		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({ code: "referential.source.unavailable" }),
		);
		expect(events.ensureEvent).not.toHaveBeenCalled();
	});
	it("waits for talk subjects before creating a new poll", async () => {
		// Arrange
		const { events, useCase } = journey({
			agenda: [],
			publicationLinks: event.publicationLinks,
		});

		// Act
		const result = await useCase.execute({ identity });

		// Assert
		expect(result.skipped).toBe(true);
		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({ code: "publication.feedback.agenda" }),
		);
		expect(events.ensureEvent).not.toHaveBeenCalled();
	});

	it("preserves the existing poll when the issue agenda is incomplete", async () => {
		// Arrange
		const { events, useCase } = journey({ agenda: [] });

		// Act
		const result = await useCase.execute({ identity });

		// Assert
		expect(events.ensureEvent.mock.calls[0][0]).not.toHaveProperty("agenda");
		expect(result.feedbackUrl).toBe(feedbackUrl);
		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({
				code: "publication.feedback.agenda",
				severity: "warning",
			}),
		);
	});
	it("reconciles a changed feedback title", async () => {
		// Arrange
		const revisedTitle = "Updated platform evening";
		const { deps, events, useCase } = journey({ eventTitle: revisedTitle });

		// Act
		const result = await useCase.execute({ identity });

		// Assert
		expect(events.ensureEvent).toHaveBeenCalledWith({
			key: `${identity.repository}#${identity.issueNumber}`,
			name: revisedTitle,
			scheduleUrl: `https://github.com/${identity.repository}/issues/${identity.issueNumber}`,
			agenda: feedbackAgenda,
			url: feedbackUrl,
		});
		expect(result).toMatchObject({ feedbackUrl, persisted: false });
		expect(deps.repository.applyPatch).not.toHaveBeenCalled();
	});

	it.each([
		{
			occurrenceStatus: "cancelled" as const,
			labels: [...event.labels, "event:cancelled"],
		},
		{
			occurrenceStatus: "postponed" as const,
			labels: [...event.labels, "event:postponed"],
		},
		{ issueState: "closed" as const },
		{ date: "invalid" },
	])(
		"does not update feedback for inactive or invalid events: %j",
		async (overrides) => {
			// Arrange
			const { events, useCase } = journey({
				...overrides,
				publicationLinks: event.publicationLinks,
			});

			// Act
			const result = await useCase.execute({ identity });

			// Assert
			expect(result.skipped).toBe(true);
			expect(events.ensureEvent).not.toHaveBeenCalled();
		},
	);

	it("normalizes the public URL in the issue", async () => {
		// Arrange
		const { deps, useCase } = journey({
			publicationLinks: {
				...event.publicationLinks,
				feedback: `${feedbackUrl}/`,
			},
		});

		// Act
		const result = await useCase.execute({ identity });

		// Assert
		expect(result).toMatchObject({
			persisted: true,
			feedbackUrl,
		});
		expect(deps.repository.applyPatch).toHaveBeenCalledOnce();
	});

	it("creates and persists missing feedback idempotently", async () => {
		// Arrange
		const { deps, events, useCase } = journey({
			publicationLinks: event.publicationLinks,
		});

		// Act
		const result = await useCase.execute({ identity });
		const repeated = await useCase.execute({ identity });

		// Assert
		expect(result).toMatchObject({
			skipped: false,
			persisted: true,
			feedbackUrl,
		});
		expect(events.ensureEvent).toHaveBeenNthCalledWith(1, {
			key: `${identity.repository}#${identity.issueNumber}`,
			name: event.eventTitle,
			scheduleUrl: `https://github.com/${identity.repository}/issues/${identity.issueNumber}`,
			agenda: feedbackAgenda,
		});
		expect(events.ensureEvent).toHaveBeenNthCalledWith(2, {
			key: `${identity.repository}#${identity.issueNumber}`,
			name: event.eventTitle,
			scheduleUrl: `https://github.com/${identity.repository}/issues/${identity.issueNumber}`,
			agenda: feedbackAgenda,
			url: feedbackUrl,
		});
		expect(deps.repository.applyPatch).toHaveBeenCalledOnce();
		expect(events.ensureEvent.mock.invocationCallOrder[0]).toBeLessThan(
			vi.mocked(deps.repository.applyPatch).mock.invocationCallOrder[0],
		);
		expect(repeated.persisted).toBe(false);
	});

	it("prepares future feedback", async () => {
		// Arrange
		const { events, useCase } = journey({
			publicationLinks: event.publicationLinks,
		});

		// Act
		const result = await useCase.execute({ identity });

		// Assert
		expect(result).toMatchObject({
			persisted: true,
			feedbackUrl,
		});
		expect(events.ensureEvent).toHaveBeenCalledOnce();
	});

	it("limits the event name to the API maximum length", async () => {
		// Arrange
		const { events, useCase } = journey({
			publicationLinks: event.publicationLinks,
			eventTitle: "A".repeat(120),
		});

		// Act
		await useCase.execute({ identity });

		// Assert
		expect(events.ensureEvent).toHaveBeenCalledWith(
			expect.objectContaining({ name: "A".repeat(100) }),
		);
	});

	it.each([undefined, feedbackUrl])(
		"requires a title before synchronizing feedback (%s)",
		async (feedback) => {
			// Arrange
			const { events, useCase } = journey({
				publicationLinks: { ...event.publicationLinks, feedback },
				eventTitle: "",
			});

			// Act
			const result = await useCase.execute({ identity });

			// Assert
			expect(result.diagnostics).toContainEqual(
				expect.objectContaining({ code: "publication.feedback.prerequisites" }),
			);
			expect(events.ensureEvent).not.toHaveBeenCalled();
		},
	);

	it("does not create feedback after the source issue changes", async () => {
		// Arrange
		const { deps, events, useCase } = journey({
			publicationLinks: event.publicationLinks,
		});
		vi.mocked(deps.repository.find)
			.mockResolvedValueOnce(sourceDocument)
			.mockResolvedValue({ ...sourceDocument, body: "human edit" });

		// Act
		const operation = useCase.execute({ identity });

		// Assert
		await expect(operation).rejects.toMatchObject({
			name: "EventConcurrentModificationError",
		});
		expect(events.ensureEvent).not.toHaveBeenCalled();
		expect(deps.repository.applyPatch).not.toHaveBeenCalled();
	});

	it.each([undefined, feedbackUrl])(
		"preserves issue edits made during event synchronization (%s)",
		async (feedback) => {
			// Arrange
			const { deps, events, useCase } = journey({
				publicationLinks: { ...event.publicationLinks, feedback },
			});
			events.ensureEvent.mockImplementation(async () => {
				vi.mocked(deps.repository.find).mockResolvedValue({
					...sourceDocument,
					body: "human edit",
				});
				return feedbackUrl;
			});

			// Act
			const operation = useCase.execute({ identity });

			// Assert
			await expect(operation).rejects.toMatchObject({
				name: "EventConcurrentModificationError",
			});
			expect(deps.repository.applyPatch).not.toHaveBeenCalled();
		},
	);

	it("reuses the same source key after a failed issue save", async () => {
		// Arrange
		const { deps, events, useCase } = journey({
			publicationLinks: event.publicationLinks,
		});
		vi.mocked(deps.repository.applyPatch).mockRejectedValueOnce(
			new Error("Issue save failed"),
		);

		// Act
		const firstError = await useCase
			.execute({ identity })
			.catch((error: unknown) => error);
		const retried = await useCase.execute({ identity });

		// Assert
		expect(firstError).toMatchObject({ message: "Issue save failed" });
		expect(retried).toMatchObject({
			persisted: true,
			feedbackUrl,
		});
		expect(events.ensureEvent).toHaveBeenCalledTimes(2);
		expect(events.ensureEvent.mock.calls[0]).toEqual(
			events.ensureEvent.mock.calls[1],
		);
	});

	it("does not save or publish feedback when event creation fails", async () => {
		// Arrange
		const { deps, events, useCase } = journey({
			publicationLinks: event.publicationLinks,
		});
		events.ensureEvent.mockRejectedValue(
			new Error("OpenFeedback request failed (HTTP 401)"),
		);

		// Act
		const operation = useCase.execute({ identity });

		// Assert
		await expect(operation).rejects.toThrow("HTTP 401");
		expect(deps.repository.applyPatch).not.toHaveBeenCalled();
	});
});
