import type { MeetupEvent } from "@meetup-automation/event";
import { ScheduledEventError } from "@meetup-automation/publication";
import { describe, expect, it, vi } from "vitest";
import { event, identity } from "../../testing/meetup-journey.fixtures.js";
import {
	publicationUrl,
	publicationFixture as setupPublication,
} from "../../testing/meetup-publication.fixtures.js";

import { ManageMeetupPublication } from "./manage-meetup-publication.js";

function publicationFixture(...args: Parameters<typeof setupPublication>) {
	const fixture = setupPublication(...args);
	return {
		...fixture,
		useCase: new ManageMeetupPublication(fixture.dependencies),
	};
}

describe("Meetup event publication", () => {
	it("creates a draft and records its identity without marking the issue published", async () => {
		// Arrange
		const { useCase, gateway, journal, deps } = publicationFixture();

		// Act
		const result = await useCase.execute(identity);

		// Assert
		expect(result.status).toBe("draft");
		expect(result.reviewUrl).toBe(publicationUrl);
		expect(gateway.save).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "Cloud Native Evening",
				date: "2026-09-30",
				startTime: "18:45",
				endTime: "20:45",
				timeZone: "Europe/Paris",
				description: expect.stringContaining(
					"Reliable platforms\nExample Speaker",
				),
			}),
			undefined,
			expect.any(Function),
			expect.any(Function),
		);
		expect(journal.reserve.mock.invocationCallOrder[0]).toBeLessThan(
			journal.record.mock.invocationCallOrder[0],
		);
		expect(journal.record).toHaveBeenCalledWith(publicationUrl);
		expect(deps.documentCodec.createPatch).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				publicationLinks: { meetup: publicationUrl },
				operationalChecklists: expect.objectContaining({
					communication: [{ name: "Meetup event published", completed: false }],
				}),
			}),
		);
		expect(journal.record.mock.invocationCallOrder[0]).toBeLessThan(
			vi.mocked(deps.repository.applyPatch).mock.invocationCallOrder[0],
		);
	});

	it("updates the linked event without reserving a second creation", async () => {
		// Arrange
		const { useCase, gateway, journal, deps } = publicationFixture({
			publicationLinks: { meetup: publicationUrl },
		});

		// Act
		const result = await useCase.execute(identity);

		// Assert
		expect(result.status).toBe("updated");
		expect(gateway.save.mock.calls[0]?.[1]).toBe(publicationUrl);
		expect(journal.reserve).not.toHaveBeenCalled();
		expect(deps.repository.applyPatch).not.toHaveBeenCalled();
	});

	it("keeps a recovered draft pending organizer approval on every rerun", async () => {
		// Arrange
		const { useCase, gateway, journal, deps } = publicationFixture(
			{
				publicationLinks: { meetup: publicationUrl },
				operationalChecklists: {
					...event.operationalChecklists,
					communication: [{ name: "Meetup event published", completed: false }],
				},
			},
			{ url: publicationUrl },
		);
		gateway.save.mockImplementation(async (_, url, before, after) => {
			await before();
			await after(url ?? publicationUrl);
			return { url: url ?? publicationUrl, status: "draft" };
		});

		// Act
		const first = await useCase.execute(identity);
		const second = await useCase.execute(identity);

		// Assert
		expect(first.status).toBe("draft");
		expect(second.status).toBe("draft");
		expect(second.reviewUrl).toBe(publicationUrl);
		expect(
			gateway.save.mock.calls.every((call) => call[1] === publicationUrl),
		).toBe(true);
		expect(journal.reserve).not.toHaveBeenCalled();
		expect(deps.repository.applyPatch).not.toHaveBeenCalled();
	});

	it("checks publication after the saved draft is published by an organizer", async () => {
		// Arrange
		const { useCase, journal, deps } = publicationFixture(
			{
				publicationLinks: { meetup: publicationUrl },
				operationalChecklists: {
					...event.operationalChecklists,
					communication: [{ name: "Meetup event published", completed: false }],
				},
			},
			{ url: publicationUrl },
		);

		// Act
		const result = await useCase.execute(identity);

		// Assert
		expect(result.status).toBe("updated");
		expect(result.reviewUrl).toBeUndefined();
		expect(journal.reserve).not.toHaveBeenCalled();
		expect(deps.documentCodec.createPatch).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				publicationLinks: { meetup: publicationUrl },
				operationalChecklists: expect.objectContaining({
					communication: [{ name: "Meetup event published", completed: true }],
				}),
			}),
		);
		expect(journal.record.mock.invocationCallOrder[0]).toBeLessThan(
			vi.mocked(deps.repository.applyPatch).mock.invocationCallOrder[0],
		);
	});

	it("keeps a draft link and clears an incorrectly checked publication task", async () => {
		// Arrange
		const { useCase, gateway, journal, deps } = publicationFixture({
			publicationLinks: { meetup: publicationUrl },
		});
		gateway.save.mockImplementation(async (_, _url, before, after) => {
			await before();
			await after(publicationUrl);
			return { url: publicationUrl, status: "draft" };
		});

		// Act
		const result = await useCase.execute(identity);

		// Assert
		expect(result.status).toBe("draft");
		expect(journal.record).toHaveBeenCalledWith(publicationUrl);
		expect(deps.documentCodec.createPatch).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				publicationLinks: { meetup: publicationUrl },
				operationalChecklists: expect.objectContaining({
					communication: [{ name: "Meetup event published", completed: false }],
				}),
			}),
		);
	});

	it("rejects a gateway that reports a newly created event as published", async () => {
		// Arrange
		const { useCase, gateway, journal, deps } = publicationFixture();
		gateway.save.mockImplementation(async (_, _url, before, after) => {
			await before();
			await after(publicationUrl);
			return { url: publicationUrl, status: "published" };
		});

		// Act
		const result = await useCase.execute(identity);

		// Assert
		expect(result.diagnostics[0]?.code).toBe("publication.meetup.verification");
		expect(journal.record).toHaveBeenCalledWith(publicationUrl);
		expect(deps.repository.applyPatch).not.toHaveBeenCalled();
	});

	it("recovers a created event after an interrupted issue patch", async () => {
		// Arrange
		const { useCase, gateway, journal } = publicationFixture(
			{},
			{ url: publicationUrl },
		);

		// Act
		const result = await useCase.execute(identity);

		// Assert
		expect(result.status).toBe("updated");
		expect(gateway.save.mock.calls[0]?.[1]).toBe(publicationUrl);
		expect(journal.reserve).not.toHaveBeenCalled();
	});

	it("blocks an uncertain creation on every rerun without creating another draft", async () => {
		// Arrange
		const { useCase, gateway, journal } = publicationFixture();
		gateway.save.mockImplementation(async (_, _url, before) => {
			await before();
			throw new ScheduledEventError("uncertain");
		});

		// Act
		const first = await useCase.execute(identity);
		const second = await useCase.execute(identity);

		// Assert
		expect(first.diagnostics[0]?.code).toBe("publication.meetup.uncertain");
		expect(second.diagnostics[0]?.code).toBe("publication.meetup.uncertain");
		expect(journal.reserve).toHaveBeenCalledTimes(1);
		expect(gateway.save).toHaveBeenCalledTimes(1);
	});

	it("allows recovery by an organizer-supplied link after an uncertain create", async () => {
		// Arrange
		const { useCase, journal } = publicationFixture(
			{ publicationLinks: { meetup: publicationUrl } },
			{},
		);

		// Act
		const result = await useCase.execute(identity);

		// Assert
		expect(result.status).toBe("updated");
		expect(journal.reserve).not.toHaveBeenCalled();
	});

	it.each([
		{ issueState: "closed" },
		{ occurrenceStatus: "cancelled" },
		{ occurrenceStatus: "postponed" },
		{ occurrenceStatus: "held" },
		{ date: "2026-09-28" },
		{ proposalStatus: "stale" },
		{ confirmations: { host: false, speakers: true } },
		{ confirmations: { host: true, speakers: false } },
		{ host: { id: "missing-host", displayName: "Unknown" } },
		{ agenda: [] },
		{ eventTitle: "" },
		{ publicationLinks: { meetup: "https://untrusted.example/events/12345/" } },
	] satisfies Partial<MeetupEvent>[])(
		"does not save invalid or inactive input %j",
		async (overrides) => {
			// Arrange
			const { useCase, gateway, journal } = publicationFixture(overrides);

			// Act
			const result = await useCase.execute(identity);

			// Assert
			expect(["blocked", "skipped"]).toContain(result.status);
			expect(gateway.save).not.toHaveBeenCalled();
			expect(journal.reserve).not.toHaveBeenCalled();
		},
	);

	it("does not overwrite a different event linked by an organizer", async () => {
		// Arrange
		const { useCase, gateway } = publicationFixture(
			{
				publicationLinks: { meetup: publicationUrl.replace("12345", "67890") },
			},
			{ url: publicationUrl },
		);

		// Act
		const result = await useCase.execute(identity);

		// Assert
		expect(result.diagnostics[0]?.code).toBe("publication.meetup.conflict");
		expect(gateway.save).not.toHaveBeenCalled();
	});

	it("recognizes the journal identity when the issue omits its trailing slash", async () => {
		// Arrange
		const { useCase, gateway, journal } = publicationFixture(
			{ publicationLinks: { meetup: publicationUrl.slice(0, -1) } },
			{ url: publicationUrl },
		);

		// Act
		const result = await useCase.execute(identity);

		// Assert
		expect(result.status).toBe("updated");
		expect(gateway.save.mock.calls[0]?.[1]).toBe(publicationUrl);
		expect(journal.reserve).not.toHaveBeenCalled();
	});

	it.each([
		`${publicationUrl}?token=private`,
		"https://www.meetup.com/other-group/events/12345/",
		"https://www.meetup.com/example-group/events/0123/",
	])(
		"rejects invalid journal identities before remote effects: %s",
		async (url) => {
			// Arrange
			const { useCase, gateway, journal, approval } = publicationFixture(
				{},
				{ url },
			);

			// Act
			const result = await useCase.execute(identity);

			// Assert
			expect(result.diagnostics[0]?.code).toBe("publication.meetup.link");
			expect(gateway.save).not.toHaveBeenCalled();
			expect(journal.reserve).not.toHaveBeenCalled();
			expect(approval.request).not.toHaveBeenCalled();
		},
	);

	it("blocks submission if the issue changes while the editor is being prepared", async () => {
		// Arrange
		const { useCase, deps, journal, current } = publicationFixture();
		vi.mocked(deps.repository.find)
			.mockResolvedValueOnce(current)
			.mockResolvedValue({ ...current, body: "organizer edit" });

		// Act
		const result = useCase.execute(identity);

		// Assert
		await expect(result).rejects.toThrow();
		expect(journal.reserve).not.toHaveBeenCalled();
		expect(deps.repository.applyPatch).not.toHaveBeenCalled();
	});

	it("keeps a known remote identity when verification fails", async () => {
		// Arrange
		const { useCase, gateway, journal, deps } = publicationFixture();
		gateway.save.mockImplementation(async (_, _url, before, after) => {
			await before();
			await after(publicationUrl);
			throw new ScheduledEventError("verification");
		});

		// Act
		const result = await useCase.execute(identity);

		// Assert
		expect(result.diagnostics[0]?.code).toBe("publication.meetup.verification");
		expect(journal.record).toHaveBeenCalledWith(publicationUrl);
		expect(deps.repository.applyPatch).not.toHaveBeenCalled();
	});
	it("blocks malformed Communication checklists before saving remotely", async () => {
		// Arrange
		const { useCase, manageEvent, gateway } = publicationFixture();
		const evaluation = await manageEvent.execute({ identity, mode: "check" });
		manageEvent.execute.mockResolvedValue({
			...evaluation,
			diagnostics: [
				{
					code: "event.document.checkbox.invalid",
					field: "Communication",
					severity: "warning",
					message: "Malformed checklist",
				},
			],
		});

		// Act
		const result = await useCase.execute(identity);

		// Assert
		expect(result.status).toBe("blocked");
		expect(gateway.save).not.toHaveBeenCalled();
	});
	it.each(["pending", "rejected"] as const)(
		"keeps drafts unpublished when approval is %s",
		async (status) => {
			// Arrange
			const { useCase, approval, gateway, currentEvent } = publicationFixture();
			approval.request.mockResolvedValue({ status, notificationFailed: false });

			// Act
			const result = await useCase.execute(identity);

			// Assert
			expect(result.status).toBe("draft");
			expect(result.diagnostics[0]?.code).toBe(
				`publication.meetup.approval-${status}`,
			);
			expect(gateway.publish).not.toHaveBeenCalled();
			expect(currentEvent.publicationLinks.meetup).toBe(publicationUrl);
			expect(currentEvent.operationalChecklists.communication).toContainEqual({
				name: "Meetup event published",
				completed: false,
			});
			expect(approval.request).toHaveBeenCalledWith(
				expect.objectContaining({
					kind: "meetup-publication",
					publication: expect.objectContaining({
						url: publicationUrl,
						title: "Cloud Native Evening",
					}),
				}),
			);
		},
	);

	it("publishes an approved draft and records only verified publication", async () => {
		// Arrange
		const { useCase, approval, gateway, currentEvent } = publicationFixture();
		approval.request.mockResolvedValue({
			status: "approved",
			notificationFailed: false,
		});

		// Act
		const first = await useCase.execute(identity);
		const repeat = await useCase.execute(identity);

		// Assert
		expect(first.status).toBe("updated");
		expect(repeat.status).toBe("updated");
		expect(gateway.publish).toHaveBeenCalledOnce();
		expect(approval.request).toHaveBeenCalledTimes(2);
		expect(approval.request.mock.calls[0]?.[0].revision).toBe(
			approval.request.mock.calls[1]?.[0].revision,
		);
		expect(currentEvent.operationalChecklists.communication).toContainEqual({
			name: "Meetup event published",
			completed: true,
		});
	});

	it("rechecks approval at the publishing guard", async () => {
		// Arrange
		const { useCase, approval, currentEvent } = publicationFixture();
		approval.request
			.mockResolvedValueOnce({ status: "approved", notificationFailed: false })
			.mockResolvedValue({ status: "pending", notificationFailed: false });

		// Act
		const result = await useCase.execute(identity);

		// Assert
		expect(result.status).toBe("blocked");
		expect(result.diagnostics[0]?.code).toBe(
			"publication.meetup.approval-pending",
		);
		expect(currentEvent.operationalChecklists.communication).toContainEqual({
			name: "Meetup event published",
			completed: false,
		});
	});

	it("does not publish after the issue changes during approval", async () => {
		// Arrange
		const { useCase, approval, current, currentEvent } = publicationFixture();
		approval.request.mockImplementation(async () => {
			Object.assign(current, { body: "organizer edit" });
			return { status: "approved", notificationFailed: false };
		});

		// Act
		const result = useCase.execute(identity);

		// Assert
		await expect(result).rejects.toThrow();
		expect(currentEvent.operationalChecklists.communication).toContainEqual({
			name: "Meetup event published",
			completed: false,
		});
	});

	it.each(["approval-unavailable", "approval-notification-failed"])(
		"reports %s without publishing an unapproved draft",
		async (failure) => {
			// Arrange
			const { useCase, approval, gateway } = publicationFixture();
			if (failure === "approval-unavailable")
				approval.request.mockRejectedValue(new Error("private API failure"));
			else
				approval.request.mockResolvedValue({
					status: "pending",
					notificationFailed: true,
				});

			// Act
			const result = await useCase.execute(identity);

			// Assert
			expect(result.diagnostics[0]?.code).toBe(`publication.meetup.${failure}`);
			expect(gateway.publish).not.toHaveBeenCalled();
			expect(JSON.stringify(result)).not.toContain("private");
		},
	);

	it("retains the draft checkbox when publishing cannot be verified", async () => {
		// Arrange
		const { useCase, approval, gateway, currentEvent } = publicationFixture();
		approval.request.mockResolvedValue({
			status: "approved",
			notificationFailed: false,
		});
		gateway.publish.mockResolvedValue({ url: publicationUrl, status: "draft" });

		// Act
		const result = await useCase.execute(identity);

		// Assert
		expect(result.diagnostics[0]?.code).toBe("publication.meetup.verification");
		expect(currentEvent.operationalChecklists.communication).toContainEqual({
			name: "Meetup event published",
			completed: false,
		});
	});
});
