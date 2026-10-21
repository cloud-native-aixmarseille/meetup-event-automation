import { EventDomainComposition } from "@meetup-automation/event";
import { ReferentialDomainComposition } from "@meetup-automation/referential";
import { describe, expect, it, vi } from "vitest";
import {
	catalog,
	config,
	createEventDependencies,
	event,
	identity,
} from "../../testing/meetup-journey.fixtures.js";
import { JourneyComposition } from "../dependency-composition.js";
import { JourneyPolicyComposition } from "../policy-composition.js";
import { ManageMeetupEvent } from "./manage-meetup-event.js";

describe("ManageMeetupEvent manual publication tasks", () => {
	it.each([false, true])(
		"requires a published Meetup event for readiness: %s",
		async (completed) => {
			// Arrange
			const eventDependencies = createEventDependencies();
			vi.mocked(eventDependencies.documentCodec.decode).mockReturnValue({
				event: {
					...event,
					occurrenceStatus: "scheduled",
					operationalChecklists: {
						...event.operationalChecklists,
						communication: [{ name: "Meetup event published", completed }],
					},
				},
				diagnostics: [],
			});
			const useCase = new ManageMeetupEvent(
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
					createResolveEventReferences: (...args) =>
						new ReferentialDomainComposition().resolveEventReferences(...args),
				},
				{
					proposalSource: { load: vi.fn() },
					config,
					referentialRepository: { load: async () => catalog },
					eventDependencies,
				},
			);

			// Act
			const result = await useCase.execute({ identity, mode: "check" });

			// Assert
			expect(result.skipped).toBe(false);
			if (result.skipped) throw new Error("Expected a managed event");
			expect(result.isReady).toBe(completed);
			expect(
				result.diagnostics.some(
					(item) => item.code === "publication.meetup.unpublished",
				),
			).toBe(!completed);
			expect(result.manualPublicationTasks).toContainEqual(
				expect.objectContaining({
					kind: "publish-meetup-event",
					status: completed ? "completed" : "pending",
				}),
			);
		},
	);

	it("honors injected rules instead of replacing them with defaults", async () => {
		// Arrange
		const evaluate = vi.fn().mockReturnValue({
			patch: { operations: [] },
			diagnostics: [
				{
					code: "event.custom-policy",
					severity: "error",
					category: "invalid",
					message: "Custom event policy failed",
				},
			],
		});
		const useCase = new ManageMeetupEvent(
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
				createResolveEventReferences: (...args) =>
					new ReferentialDomainComposition().resolveEventReferences(...args),
			},
			{
				proposalSource: { load: vi.fn() },
				config,
				referentialRepository: { load: async () => catalog },
				eventDependencies: {
					...createEventDependencies(),
					rules: [{ id: "custom-policy", dependencies: [], evaluate }],
				},
			},
		);

		// Act
		const result = await useCase.execute({ identity, mode: "check" });

		// Assert
		expect(evaluate).toHaveBeenCalledOnce();
		expect(result).toMatchObject({
			skipped: false,
			isReady: false,
			diagnostics: expect.arrayContaining([
				expect.objectContaining({ code: "event.custom-policy" }),
			]),
		});
	});

	it("returns composed task status and diagnoses only pending manual work", async () => {
		// Arrange
		const eventDependencies = createEventDependencies();
		const useCase = new ManageMeetupEvent(
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
				createResolveEventReferences: (...args) =>
					new ReferentialDomainComposition().resolveEventReferences(...args),
			},
			{
				proposalSource: { load: vi.fn() },
				config,
				referentialRepository: {
					load: vi.fn().mockResolvedValue(catalog),
				},
				eventDependencies: eventDependencies,
			},
		);

		// Act
		const result = await useCase.execute({
			identity,
			mode: "check",
		});

		// Assert
		expect(result.skipped).toBe(false);
		if (result.skipped) {
			throw new Error("Expected the meetup event to be managed");
		}
		expect(result.manualPublicationTasks).toEqual([
			expect.objectContaining({
				kind: "publish-meetup-event",
				status: "completed",
			}),
			expect.objectContaining({
				kind: "publish-community-event",
				status: "completed",
			}),
			expect.objectContaining({
				kind: "create-asset-folder",
				status: "completed",
			}),
			expect.objectContaining({
				kind: "publish-slides",
				status: "completed",
			}),
			expect.objectContaining({
				kind: "import-attendance",
				status: "pending",
			}),
		]);
		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({
				code: "publication.manual-task.import-attendance.pending",
				severity: "info",
			}),
		);
		expect(result.diagnostics.map(({ code }) => code)).not.toContain(
			"publication.manual-task.publish-slides.pending",
		);
	});
});
