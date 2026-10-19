import { EventDomainComposition } from "@meetup-automation/event";
import { describe, expect, it, vi } from "vitest";
import {
	catalog,
	config,
	event,
	sourceDocument,
} from "../../testing/meetup-journey.fixtures.js";
import type { ManageMeetupCommunicationsResult } from "../communication/contracts.js";
import { JourneyCommunicationComposition } from "../communication-composition.js";
import { JourneyPolicyComposition } from "../policy-composition.js";
import { ManageMeetupCommunications } from "./manage-meetup-communications.js";
import type { ManageMeetupCommunicationsDependencies } from "./manage-meetup-communications-contracts.js";

describe("communication source consistency", () => {
	it.each(["changed", "missing", "unavailable"])(
		"distinguishes %s source observations before dispatch",
		async (observation) => {
			// Arrange
			const failure = new Error("Synthetic source transport failure");
			const find = vi.fn().mockResolvedValueOnce(sourceDocument);
			if (observation === "unavailable") find.mockRejectedValueOnce(failure);
			else
				find.mockResolvedValueOnce(
					observation === "missing"
						? null
						: { ...sourceDocument, body: "Changed organizer content" },
				);
			const dependencies: ManageMeetupCommunicationsDependencies = {
				contentGate: { blocked: vi.fn().mockResolvedValue([]) },
				config: {
					...config,
					communication: { ...config.communication, "dispatch-enabled": true },
				},
				eventRepository: { find, applyPatch: vi.fn(), listPage: vi.fn() },
				eventDocumentCodec: { decode: vi.fn(), createPatch: vi.fn() },
				referentialRepository: { load: vi.fn().mockResolvedValue(catalog) },
				manageEvent: {
					execute: vi.fn().mockResolvedValue({
						skipped: false,
						event,
						state: "ready",
						isReady: true,
						manualPublicationTasks: [],
						persisted: false,
						diagnostics: [],
					}),
				},
				feedbackResults: { resolve: vi.fn() },
				organizerApproval: { request: vi.fn(), synchronize: vi.fn() },
				clock: { now: () => new Date("2026-10-01T10:00:00Z") },
				reconcileCommunications: vi.fn(),
			};
			const journey = new ManageMeetupCommunications(
				{
					communicationDispatchPolicy:
						new JourneyPolicyComposition().communicationDispatchPolicy(),
					communicationJourneyResults:
						new JourneyPolicyComposition().communicationJourneyResults(),
					eventDocumentConcurrency:
						new EventDomainComposition().eventDocumentConcurrency(),
					communicationChecklist:
						new JourneyPolicyComposition().communicationChecklist(),
					communicationPlaceholders:
						new JourneyPolicyComposition().communicationPlaceholders(),
					createCommunicationDeliveryPreparation: (...args) =>
						new JourneyCommunicationComposition().communicationDeliveryPreparation(
							...args,
						),
					createApproveCommunicationBatch: (...args) =>
						new JourneyCommunicationComposition().approveCommunicationBatch(
							...args,
						),
					createCompleteCommunicationChecklist: (...args) =>
						new JourneyCommunicationComposition().completeCommunicationChecklist(
							...args,
						),
				},
				dependencies,
			);
			let result: ManageMeetupCommunicationsResult | undefined;
			let error: unknown;

			// Act
			try {
				result = await journey.execute({
					issueNumber: sourceDocument.identity.issueNumber,
					owner: "organization",
					repo: "meetups",
				});
			} catch (caught) {
				error = caught;
			}

			// Assert
			if (observation === "unavailable") {
				expect(error).toBe(failure);
				expect(result).toBeUndefined();
			} else {
				expect(error).toBeUndefined();
				expect(result?.runtimeDiagnostics).toContainEqual({
					code: "communication.event-concurrently-modified",
					severity: "error",
				});
			}
			expect(dependencies.reconcileCommunications).not.toHaveBeenCalled();
			expect(dependencies.organizerApproval.request).not.toHaveBeenCalled();
			expect(dependencies.eventRepository.applyPatch).not.toHaveBeenCalled();
		},
	);
});
