import type { EventDocument, MeetupEvent } from "@meetup-automation/event";
import { EventDomainComposition } from "@meetup-automation/event";
import {
	type FeedbackEventGateway,
	type FeedbackLinkGateway,
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
	event,
	identity,
	sourceDocument,
} from "../../testing/meetup-journey.fixtures.js";
import { JourneyComposition } from "../dependency-composition.js";
import { JourneyPolicyComposition } from "../policy-composition.js";
import { ManageMeetupEvent } from "./manage-meetup-event.js";
import { ManageMeetupFeedback } from "./manage-meetup-feedback.js";

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
	now = "2026-09-29T10:00:00Z",
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
	const links = {
		updateTarget: vi
			.fn<FeedbackLinkGateway["updateTarget"]>()
			.mockResolvedValue(true),
	};
	const useCase = new ManageMeetupFeedback(
		{
			feedbackPolicy: new PublicationDomainComposition().feedbackPolicy(),
			feedbackAgendaProjection:
				new JourneyPolicyComposition().feedbackAgendaProjection(),
			eventRepositoryPatches:
				new EventDomainComposition().eventRepositoryPatches(),
			feedbackLinkSelection:
				new PublicationDomainComposition().feedbackLinkSelection(),
			eventDocumentConcurrency:
				new EventDomainComposition().eventDocumentConcurrency(),
		},
		{
			eventLabel: "meetup",
			eventRepository: deps.repository,
			documentCodec: deps.documentCodec,
			clock: { now: () => now },
			links,
			events,
			manageEvent: new ManageMeetupEvent(
				{
					eventPublicationEvaluation:
						new JourneyPolicyComposition().eventPublicationEvaluation(),
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
	return { deps, events, links, useCase };
}

describe("meetup feedback journey", () => {
	it.each(["repeated", "unbounded"] as const)(
		"does not switch the shared link after %s event pagination",
		async (failure) => {
			// Arrange
			const { deps, links, useCase } = journey();
			vi.mocked(deps.repository.listPage).mockImplementation(
				async ({ cursor }) => ({
					items: [],
					nextCursor:
						failure === "repeated" ? "same" : String(Number(cursor ?? "0") + 1),
				}),
			);

			// Act
			const operation = useCase.execute({ identity });

			// Assert
			await expect(operation).rejects.toMatchObject({
				name: "EventPaginationError",
			});
			expect(deps.repository.listPage).toHaveBeenCalledTimes(
				failure === "repeated" ? 2 : 20,
			);
			expect(links.updateTarget).not.toHaveBeenCalled();
		},
	);
	it("reports conflicting feedback identities without updating the issue or shared link", async () => {
		// Arrange
		const { deps, events, links, useCase } = journey();
		const error = new FeedbackResolutionError("conflict");
		error.message = "private provider contents";
		events.ensureEvent.mockRejectedValue(error);

		// Act
		const result = await useCase.execute({ identity });

		// Assert
		expect(result).toMatchObject({
			skipped: true,
			persisted: false,
			linkUpdated: false,
			diagnostics: [
				{
					code: "publication.feedback.conflict",
					severity: "warning",
				},
			],
		});
		expect(JSON.stringify(result)).not.toContain("private provider contents");
		expect(deps.repository.applyPatch).not.toHaveBeenCalled();
		expect(links.updateTarget).not.toHaveBeenCalled();
	});
	it("keeps feedback unchanged when live profiles cannot be refreshed, including a manual agenda", async () => {
		// Arrange
		const { useCase, events, links } = journey({}, undefined, {
			load: async () => {
				throw new ProposalSourceError("unavailable");
			},
		});

		// Act
		const result = await useCase.execute({ identity });

		// Assert
		expect(result).toMatchObject({
			skipped: true,
			persisted: false,
			linkUpdated: false,
		});
		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({ code: "referential.source.unavailable" }),
		);
		expect(events.ensureEvent).not.toHaveBeenCalled();
		expect(links.updateTarget).not.toHaveBeenCalled();
	});
	it("waits for talk subjects before creating a new poll", async () => {
		// Arrange
		const { events, links, useCase } = journey({
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
		expect(links.updateTarget).not.toHaveBeenCalled();
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
	it.each(["2026-09-29T10:00:00Z", "2026-09-30T10:00:00Z"])(
		"updates the shared link to the existing poll during the update window: %s",
		async (now) => {
			// Arrange
			const { deps, events, links, useCase } = journey({}, now);

			// Act
			const result = await useCase.execute({ identity });

			// Assert
			expect(result).toMatchObject({
				persisted: false,
				linkUpdated: true,
				feedbackUrl,
			});
			expect(links.updateTarget).toHaveBeenCalledWith(feedbackUrl);
			expect(deps.repository.applyPatch).not.toHaveBeenCalled();
			expect(events.ensureEvent).toHaveBeenCalledExactlyOnceWith({
				key: `${identity.repository}#${identity.issueNumber}`,
				name: event.eventTitle,
				scheduleUrl: `https://github.com/${identity.repository}/issues/${identity.issueNumber}`,
				agenda: feedbackAgenda,
				url: feedbackUrl,
			});
		},
	);

	it("synchronizes a changed title before the short link update day", async () => {
		// Arrange
		const revisedTitle = "Updated platform evening";
		const { deps, events, links, useCase } = journey(
			{ eventTitle: revisedTitle },
			"2026-09-28T10:00:00Z",
		);

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
		expect(links.updateTarget).not.toHaveBeenCalled();
	});

	it.each(["2026-09-28T10:00:00Z", "2026-10-01T10:00:00Z"])(
		"leaves the shared link unchanged outside the update window: %s",
		async (now) => {
			// Arrange
			const { links, useCase } = journey({}, now);

			// Act
			const result = await useCase.execute({ identity });

			// Assert
			expect(result.feedbackUrl).toBe(feedbackUrl);
			expect(result.linkUpdated).toBe(false);
			expect(links.updateTarget).not.toHaveBeenCalled();
		},
	);

	it("updates the link even when talks are incomplete", async () => {
		// Arrange
		const { links, useCase } = journey({ agenda: [] });

		// Act
		const result = await useCase.execute({ identity });

		// Assert
		expect(result.feedbackUrl).toBe(feedbackUrl);
		expect(links.updateTarget).toHaveBeenCalledWith(feedbackUrl);
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
			const { events, links, useCase } = journey({
				...overrides,
				publicationLinks: event.publicationLinks,
			});

			// Act
			const result = await useCase.execute({ identity });

			// Assert
			expect(result.skipped).toBe(true);
			expect(events.ensureEvent).not.toHaveBeenCalled();
			expect(links.updateTarget).not.toHaveBeenCalled();
		},
	);

	it("leaves the shared link unchanged for conflicting active events found on a later page", async () => {
		// Arrange
		const { deps, events, links, useCase } = journey();
		vi.mocked(deps.repository.listPage)
			.mockResolvedValueOnce({ items: [], nextCursor: "2" })
			.mockResolvedValueOnce({
				items: [
					{ ...sourceDocument, identity: { ...identity, issueNumber: 99 } },
				],
			});

		// Act
		const result = await useCase.execute({ identity });

		// Assert
		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({ code: "publication.feedback.ambiguous-date" }),
		);
		expect(links.updateTarget).not.toHaveBeenCalled();
		expect(events.ensureEvent).toHaveBeenCalledOnce();
	});

	it.each([
		{
			date: "2026-09-30",
			otherDate: "2026-09-29",
			now: "2026-09-29T10:00:00Z",
			update: false,
		},
		{
			date: "2026-09-29",
			otherDate: "2026-09-30",
			now: "2026-09-29T10:00:00Z",
			update: true,
		},
		{
			date: "2026-09-30",
			otherDate: "2026-09-29",
			now: "2026-09-30T10:00:00Z",
			update: true,
		},
	])(
		"keeps today's meetup ahead of tomorrow's: $date vs $otherDate at $now",
		async ({ date, otherDate, now, update }) => {
			// Arrange
			const { deps, links, useCase } = journey({ date }, now);
			const other = {
				...sourceDocument,
				identity: { ...identity, issueNumber: 99 },
			};
			vi.mocked(deps.repository.listPage)
				.mockResolvedValueOnce({ items: [], nextCursor: "2" })
				.mockResolvedValueOnce({ items: [other] });
			vi.mocked(deps.documentCodec.decode).mockImplementation((document) => ({
				event: {
					...event,
					date: document.identity.issueNumber === 99 ? otherDate : date,
					publicationLinks: {
						...event.publicationLinks,
						feedback: feedbackUrl,
					},
				},
				diagnostics: [],
			}));

			// Act
			const result = await useCase.execute({ identity });

			// Assert
			expect(result.linkUpdated).toBe(update);
			expect(links.updateTarget).toHaveBeenCalledTimes(update ? 1 : 0);
			expect(result.diagnostics.map((item) => item.code)).toEqual(
				update ? [] : ["publication.feedback.current-event"],
			);
		},
	);

	it.each([
		{ issueState: "closed" },
		{ occurrenceStatus: "cancelled" },
		{ occurrenceStatus: "postponed" },
	] satisfies Partial<MeetupEvent>[])(
		"does not let an inactive meetup block tomorrow's link (%j)",
		async (inactive) => {
			// Arrange
			const { deps, links, useCase } = journey();
			const other = {
				...sourceDocument,
				identity: { ...identity, issueNumber: 99 },
			};
			vi.mocked(deps.repository.listPage).mockResolvedValue({ items: [other] });
			vi.mocked(deps.documentCodec.decode).mockImplementation((document) => ({
				event:
					document.identity.issueNumber === 99
						? { ...event, date: "2026-09-29", ...inactive }
						: {
								...event,
								publicationLinks: {
									...event.publicationLinks,
									feedback: feedbackUrl,
								},
							},
				diagnostics: [],
			}));

			// Act
			const result = await useCase.execute({ identity });

			// Assert
			expect(result.linkUpdated).toBe(true);
			expect(links.updateTarget).toHaveBeenCalledExactlyOnceWith(feedbackUrl);
		},
	);

	it("preserves an issue edit made while checking for concurrent meetups", async () => {
		// Arrange
		const { deps, events, links, useCase } = journey();
		vi.mocked(deps.repository.listPage).mockImplementation(async () => {
			vi.mocked(deps.repository.find).mockResolvedValue({
				...sourceDocument,
				body: "human edit",
			});
			return { items: [] };
		});

		// Act
		const operation = useCase.execute({ identity });

		// Assert
		await expect(operation).rejects.toMatchObject({
			name: "EventConcurrentModificationError",
		});
		expect(deps.repository.applyPatch).not.toHaveBeenCalled();
		expect(events.ensureEvent).toHaveBeenCalledOnce();
		expect(links.updateTarget).not.toHaveBeenCalled();
	});

	it("propagates a Kutt authentication failure", async () => {
		// Arrange
		const { deps, events, links, useCase } = journey();
		links.updateTarget.mockRejectedValue(
			new Error("Kutt request failed (HTTP 401)"),
		);

		// Act
		const operation = useCase.execute({ identity });

		// Assert
		await expect(operation).rejects.toThrow("HTTP 401");
		expect(deps.repository.applyPatch).not.toHaveBeenCalled();
		expect(events.ensureEvent).toHaveBeenCalledOnce();
		expect(links.updateTarget).toHaveBeenCalledWith(feedbackUrl);
	});

	it("normalizes the public URL and verifies the resulting issue revision before updating Kutt", async () => {
		// Arrange
		const { deps, links, useCase } = journey({
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
			linkUpdated: true,
			feedbackUrl,
		});
		expect(deps.repository.applyPatch).toHaveBeenCalledOnce();
		expect(links.updateTarget).toHaveBeenCalledWith(feedbackUrl);
	});

	it.each(["2026-09-29T10:00:00Z", "2026-09-30T10:00:00Z"])(
		"creates and persists missing feedback before switching the short link: %s",
		async (now) => {
			// Arrange
			const { deps, events, links, useCase } = journey(
				{
					publicationLinks: event.publicationLinks,
				},
				now,
			);

			// Act
			const result = await useCase.execute({ identity });
			const repeated = await useCase.execute({ identity });

			// Assert
			expect(result).toMatchObject({
				skipped: false,
				persisted: true,
				feedbackUrl,
				linkUpdated: true,
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
			expect(links.updateTarget).toHaveBeenCalledWith(feedbackUrl);
			expect(events.ensureEvent.mock.invocationCallOrder[0]).toBeLessThan(
				vi.mocked(deps.repository.applyPatch).mock.invocationCallOrder[0],
			);
			expect(
				vi.mocked(deps.repository.applyPatch).mock.invocationCallOrder[0],
			).toBeLessThan(links.updateTarget.mock.invocationCallOrder[0]);
			expect(repeated.persisted).toBe(false);
		},
	);

	it("prepares future feedback without changing the shared short link", async () => {
		// Arrange
		const { events, links, useCase } = journey(
			{ publicationLinks: event.publicationLinks },
			"2026-09-28T10:00:00Z",
		);

		// Act
		const result = await useCase.execute({ identity });

		// Assert
		expect(result).toMatchObject({
			persisted: true,
			feedbackUrl,
			linkUpdated: false,
		});
		expect(events.ensureEvent).toHaveBeenCalledOnce();
		expect(links.updateTarget).not.toHaveBeenCalled();
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
		const { deps, events, links, useCase } = journey({
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
		expect(links.updateTarget).not.toHaveBeenCalled();
	});

	it.each([undefined, feedbackUrl])(
		"preserves issue edits made during event synchronization (%s)",
		async (feedback) => {
			// Arrange
			const { deps, events, links, useCase } = journey({
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
			expect(links.updateTarget).not.toHaveBeenCalled();
		},
	);

	it("reuses the same source key after a failed issue save", async () => {
		// Arrange
		const { deps, events, links, useCase } = journey({
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
			linkUpdated: true,
		});
		expect(events.ensureEvent).toHaveBeenCalledTimes(2);
		expect(events.ensureEvent.mock.calls[0]).toEqual(
			events.ensureEvent.mock.calls[1],
		);
		expect(links.updateTarget).toHaveBeenCalledOnce();
	});

	it("does not save or publish feedback when event creation fails", async () => {
		// Arrange
		const { deps, events, links, useCase } = journey({
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
		expect(links.updateTarget).not.toHaveBeenCalled();
	});
});
