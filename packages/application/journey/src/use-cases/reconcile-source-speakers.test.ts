import type {
	ProposalSnapshot,
	SpeakerCatalogStore,
} from "@meetup-automation/referential";
import { ReferentialDomainComposition } from "@meetup-automation/referential";
import { describe, expect, it, vi } from "vitest";
import { JourneyPolicyComposition } from "../policy-composition.js";
import { ReconcileSourceSpeakers } from "./reconcile-source-speakers.js";

const snapshot: ProposalSnapshot = {
	provider: "conference-hall",
	event: "example-cfp",
	proposals: [],
	speakers: [
		{ id: "source-one", displayName: "Alex", email: "alex@example.test" },
	],
};
function dependencies() {
	const source = { load: vi.fn().mockResolvedValue(snapshot) };
	const store: SpeakerCatalogStore = {
		read: vi.fn().mockResolvedValue({
			revision: "revision",
			entries: [],
			reservedIds: [],
		}),
		candidate: vi.fn().mockResolvedValue({
			hosts: [],
			speakers: [
				{
					speakerId: "speaker-0001",
					displayName: "Alex",
					firstName: "",
					lastName: "",
					company: "",
					email: "alex@example.test",
				},
			],
		}),
		save: vi.fn().mockResolvedValue(true),
	};
	return { source, store };
}

describe("ReconcileSourceSpeakers", () => {
	it("validates the candidate before saving speakers and reserved IDs", async () => {
		// Arrange
		const { source, store } = dependencies();

		// Act
		const result = await new ReconcileSourceSpeakers(
			{
				speakerSynchronizationStageRunner:
					new JourneyPolicyComposition().speakerSynchronizationStageRunner(),
				mergeSourceSpeakers:
					new ReferentialDomainComposition().mergeSourceSpeakers(),
				createValidateReferentialCatalog: (...args) =>
					new ReferentialDomainComposition().validateReferentialCatalog(
						...args,
					),
			},
			source,
			store,
		).execute();

		// Assert
		expect(result).toEqual({ changed: true, speakerCount: 1 });
		expect(source.load).toHaveBeenCalledTimes(1);
		expect(store.save).toHaveBeenCalledOnce();
	});
	it("leaves the catalog untouched when required source fields are invalid", async () => {
		// Arrange
		const { source, store } = dependencies();
		vi.mocked(store.candidate).mockResolvedValue({
			hosts: [],
			speakers: [
				{
					speakerId: "speaker-0001",
					firstName: "",
					lastName: "",
					company: "",
					email: "",
				},
			],
		});

		// Act
		const result = new ReconcileSourceSpeakers(
			{
				speakerSynchronizationStageRunner:
					new JourneyPolicyComposition().speakerSynchronizationStageRunner(),
				mergeSourceSpeakers:
					new ReferentialDomainComposition().mergeSourceSpeakers(),
				createValidateReferentialCatalog: (...args) =>
					new ReferentialDomainComposition().validateReferentialCatalog(
						...args,
					),
			},
			source,
			store,
		).execute();

		// Assert
		await expect(result).rejects.toMatchObject({
			stage: "validate-catalog",
			diagnostics: expect.arrayContaining([
				expect.objectContaining({
					code: "referential.speaker.email.invalid",
					field: "speakers[0].email",
				}),
			]),
		});
		expect(store.save).not.toHaveBeenCalled();
	});
});
