import { EventDomainComposition } from "@meetup-automation/event";
import { PublicationDomainComposition } from "@meetup-automation/publication";
import { describe, expect, it, vi } from "vitest";
import {
	createEventDependencies,
	event,
	identity,
	sourceDocument,
} from "../../testing/meetup-journey.fixtures.js";
import { ReconcileMeetupRegistrations } from "./reconcile-meetup-registrations.js";

function fixture() {
	const dependencies = createEventDependencies();
	const source = {
		read: vi.fn().mockResolvedValue([
			["Email", "Name"],
			[" MEMBER@example.test ", "Private participant"],
			["member@example.test", "Repeated participant"],
		]),
	};
	const mapping = { emailColumn: "Email" };
	const operation = new ReconcileMeetupRegistrations({
		events: dependencies.repository,
		codec: dependencies.documentCodec,
		concurrency: new EventDomainComposition().eventDocumentConcurrency(),
		responsePolicy:
			new PublicationDomainComposition().registrationResponsePolicy(),
		source,
		eventLabel: "meetup",
	});
	return { dependencies, source, mapping, operation };
}

describe("ReconcileMeetupRegistrations", () => {
	it("blocks reconciliation when the provider capability is unavailable while keeping identities private", async () => {
		// Arrange
		const { dependencies, mapping, operation } = fixture();

		// Act
		const result = await operation.execute(identity, mapping);

		// Assert
		expect(result).toEqual({
			status: "blocked",
			responseCount: 2,
			participantCount: 1,
			duplicateCount: 1,
			invalidCount: 0,
			diagnostics: [
				{
					code: "publication.registration.provider-unavailable",
					severity: "warning",
					field: "community",
					message:
						"OCGroups membership and event registration cannot be reconciled until a supported provider capability is available",
				},
			],
		});
		expect(dependencies.repository.applyPatch).not.toHaveBeenCalled();
		expect(dependencies.documentCodec.createPatch).not.toHaveBeenCalled();
		expect(result).not.toHaveProperty("participants");
		expect(JSON.stringify(result)).not.toContain("member@example.test");
		expect(JSON.stringify(result)).not.toContain("Private participant");
	});

	it.each([
		["scheduled", "open"],
		["postponed", "open"],
		["cancelled", "open"],
		[undefined, "open"],
		["held", "closed"],
	] as const)(
		"does not read responses for %s occurrence with %s issue",
		async (occurrenceStatus, issueState) => {
			// Arrange
			const { dependencies, source, mapping, operation } = fixture();
			vi.mocked(dependencies.documentCodec.decode).mockReturnValue({
				event: { ...event, occurrenceStatus, issueState },
				diagnostics: [],
			});

			// Act
			const result = await operation.execute(identity, mapping);

			// Assert
			expect(result.status).toBe("skipped");
			expect(result.diagnostics[0].code).toBe(
				"publication.registration.inactive",
			);
			expect(source.read).not.toHaveBeenCalled();
			expect(dependencies.repository.applyPatch).not.toHaveBeenCalled();
		},
	);

	it("does not decode unrelated issues or read their responses", async () => {
		// Arrange
		const { dependencies, source, mapping, operation } = fixture();
		vi.mocked(dependencies.repository.find).mockResolvedValue({
			...sourceDocument,
			labels: ["other"],
		});

		// Act
		const result = await operation.execute(identity, mapping);

		// Assert
		expect(result.status).toBe("skipped");
		expect(result.diagnostics[0].code).toBe(
			"publication.registration.unrelated",
		);
		expect(source.read).not.toHaveBeenCalled();
		expect(dependencies.documentCodec.decode).not.toHaveBeenCalled();
	});

	it("blocks invalid event documents before reading private responses", async () => {
		// Arrange
		const { dependencies, source, mapping, operation } = fixture();
		vi.mocked(dependencies.documentCodec.decode).mockReturnValue({
			event,
			diagnostics: [
				{
					code: "event.document.invalid-field-type",
					severity: "error",
					category: "invalid",
					message: "Invalid event document",
				},
			],
		});

		// Act
		const result = await operation.execute(identity, mapping);

		// Assert
		expect(result.status).toBe("invalid");
		expect(result.diagnostics[0].code).toBe("publication.registration.event");
		expect(source.read).not.toHaveBeenCalled();
	});

	it.each([undefined, "", " "])(
		"requires a stored community event link (%s)",
		async (community) => {
			// Arrange
			const { dependencies, source, mapping, operation } = fixture();
			vi.mocked(dependencies.documentCodec.decode).mockReturnValue({
				event: {
					...event,
					publicationLinks: { ...event.publicationLinks, community },
				},
				diagnostics: [],
			});

			// Act
			const result = await operation.execute(identity, mapping);

			// Assert
			expect(result.status).toBe("invalid");
			expect(result.diagnostics[0].code).toBe(
				"publication.registration.destination",
			);
			expect(source.read).not.toHaveBeenCalled();
		},
	);

	it("reports invalid source identities before the provider capability blocker", async () => {
		// Arrange
		const { dependencies, source, mapping, operation } = fixture();
		source.read.mockResolvedValue([
			["Email", "Name"],
			["member@example.test", "Private participant"],
			["invalid-address", "Other participant"],
		]);

		// Act
		const result = await operation.execute(identity, mapping);

		// Assert
		expect(result.status).toBe("invalid");
		expect(result.responseCount).toBe(2);
		expect(result.participantCount).toBe(0);
		expect(result.invalidCount).toBe(1);
		expect(result.diagnostics.map((item) => item.code)).toEqual([
			"publication.registration.invalid",
		]);
		expect(JSON.stringify(result)).not.toContain("member@example.test");
		expect(JSON.stringify(result)).not.toContain("invalid-address");
		expect(dependencies.repository.applyPatch).not.toHaveBeenCalled();
	});

	it("does not treat an empty selection as completed reporting", async () => {
		// Arrange
		const { source, mapping, operation } = fixture();
		source.read.mockResolvedValue([["Email"]]);

		// Act
		const result = await operation.execute(identity, mapping);

		// Assert
		expect(result.status).toBe("invalid");
		expect(result.participantCount).toBe(0);
		expect(result.diagnostics.map((item) => item.code)).toEqual([
			"publication.registration.empty",
		]);
	});

	it("rejects an event changed during response evaluation", async () => {
		// Arrange
		const { dependencies, mapping, operation } = fixture();
		vi.mocked(dependencies.repository.find)
			.mockResolvedValueOnce(sourceDocument)
			.mockResolvedValue({
				...sourceDocument,
				body: "Organizer changed the event",
			});

		// Act
		const result = operation.execute(identity, mapping);

		// Assert
		await expect(result).rejects.toMatchObject({
			name: "EventConcurrentModificationError",
		});
		expect(dependencies.repository.applyPatch).not.toHaveBeenCalled();
	});

	it("reports a missing issue before reading responses", async () => {
		// Arrange
		const { dependencies, source, mapping, operation } = fixture();
		vi.mocked(dependencies.repository.find).mockResolvedValue(null);

		// Act
		const result = operation.execute(identity, mapping);

		// Assert
		await expect(result).rejects.toMatchObject({ name: "EventNotFoundError" });
		expect(source.read).not.toHaveBeenCalled();
	});

	it("propagates source failures without updating the issue", async () => {
		// Arrange
		const { dependencies, source, mapping, operation } = fixture();
		source.read.mockRejectedValue(new Error("Source request failed"));

		// Act
		const result = operation.execute(identity, mapping);

		// Assert
		await expect(result).rejects.toThrow("Source request failed");
		expect(dependencies.repository.applyPatch).not.toHaveBeenCalled();
	});
});
