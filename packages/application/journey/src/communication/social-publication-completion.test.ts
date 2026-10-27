import type { SocialDestination } from "@meetup-automation/communication";
import { EventDocumentConcurrency } from "@meetup-automation/event";
import { describe, expect, it, vi } from "vitest";
import { event, identity } from "../../testing/meetup-journey.fixtures.js";
import { publicationFixture } from "../../testing/meetup-publication.fixtures.js";
import { SocialPublicationCompletion } from "./social-publication-completion.js";
import type {
	SocialPublicationResult,
	SocialPublicationStatus,
} from "./social-publication-contracts.js";

const destinations: readonly SocialDestination[] = [
	{
		key: "engineering",
		provider: "slack",
		label: "Public Slack",
		workspaceId: "TFIRST",
		channelId: "CFIRST",
	},
	{
		key: "community",
		provider: "slack",
		label: "Public Slack",
		workspaceId: "TSECOND",
		channelId: "CSECOND",
	},
	{
		key: "page",
		provider: "linkedin",
		label: "Community Page",
		organizationUrn: "urn:li:organization:123",
	},
];
function fixture(slackCompleted = false) {
	const f = publicationFixture({
		operationalChecklists: {
			...event.operationalChecklists,
			communication: [
				{ name: "Public Slack", completed: slackCompleted },
				{ name: "Community Page", completed: false },
				{ name: "Unrelated task", completed: true },
			],
		},
	});
	const configuration = vi.fn(async () => destinations);
	const subject = new SocialPublicationCompletion(
		f.deps.repository,
		f.deps.documentCodec,
		new EventDocumentConcurrency(),
		configuration,
	);
	return { ...f, configuration, subject };
}
function result(
	target: string,
	status: SocialPublicationStatus,
	occurrence: string,
): SocialPublicationResult {
	return { target, status, occurrence, diagnostics: [] };
}
describe("social publication checklist completion", () => {
	it("completes a named announcement task only when every selected channel is recorded", async () => {
		// Arrange
		const f = fixture();
		const results = [
			result("engineering:announcement", "published", f.currentEvent.date),
			result("community:announcement", "complete", f.currentEvent.date),
		];
		// Act
		await f.subject.record(identity, results);
		// Assert
		expect(f.currentEvent.operationalChecklists.communication).toEqual([
			{ name: "Public Slack", completed: true },
			{ name: "Community Page", completed: false },
			{ name: "Unrelated task", completed: true },
		]);
		expect(f.deps.repository.applyPatch).toHaveBeenCalledOnce();
	});
	it("keeps a partially delivered group incomplete while completing an independent destination", async () => {
		// Arrange
		const f = fixture();
		const results = [
			result("engineering:announcement", "published", f.currentEvent.date),
			result("community:announcement", "uncertain", f.currentEvent.date),
			result("page:announcement", "published", f.currentEvent.date),
		];
		// Act
		await f.subject.record(identity, results);
		// Assert
		expect(f.currentEvent.operationalChecklists.communication).toEqual([
			{ name: "Public Slack", completed: false },
			{ name: "Community Page", completed: true },
			{ name: "Unrelated task", completed: true },
		]);
	});
	it.each(["d7", "d0"])(
		"does not complete announcement tasks from a %s reminder",
		async (purpose) => {
			// Arrange
			const f = fixture();
			const results = destinations.map((destination) =>
				result(
					`${destination.key}:${purpose}`,
					"published",
					f.currentEvent.date,
				),
			);
			// Act
			await f.subject.record(identity, results);
			// Assert
			expect(f.deps.repository.applyPatch).not.toHaveBeenCalled();
			expect(
				f.currentEvent.operationalChecklists.communication[0].completed,
			).toBe(false);
		},
	);
	it("does not complete a rescheduled occurrence using earlier deliveries", async () => {
		// Arrange
		const f = fixture();
		const results = destinations.map((destination) =>
			result(`${destination.key}:announcement`, "complete", "2025-01-10"),
		);
		// Act
		await f.subject.record(identity, results);
		// Assert
		expect(f.deps.repository.applyPatch).not.toHaveBeenCalled();
	});
	it("preserves manually completed tasks when delivery evidence is absent", async () => {
		// Arrange
		const f = fixture(true);
		// Act
		await f.subject.record(identity, []);
		// Assert
		expect(f.deps.repository.applyPatch).not.toHaveBeenCalled();
		expect(
			f.currentEvent.operationalChecklists.communication[0].completed,
		).toBe(true);
	});
	it("leaves tasks unchanged when destinations were removed before completion", async () => {
		// Arrange
		const f = fixture();
		f.configuration.mockResolvedValue([]);
		const results = destinations.map((destination) =>
			result(
				`${destination.key}:announcement`,
				"published",
				f.currentEvent.date,
			),
		);
		// Act
		await f.subject.record(identity, results);
		// Assert
		expect(f.deps.repository.applyPatch).not.toHaveBeenCalled();
	});
	it("does not overwrite a concurrent organizer edit", async () => {
		// Arrange
		const f = fixture();
		vi.mocked(f.deps.repository.find)
			.mockResolvedValueOnce(f.current)
			.mockResolvedValueOnce({
				...f.current,
				body: "Concurrent organizer edit",
			});
		const results = [
			result("page:announcement", "published", f.currentEvent.date),
		];
		// Act
		const operation = f.subject.record(identity, results);
		// Assert
		await expect(operation).rejects.toThrow();
		expect(f.deps.repository.applyPatch).not.toHaveBeenCalled();
	});
});
