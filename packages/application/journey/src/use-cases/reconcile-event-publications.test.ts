import type { EventIdentity, MeetupEvent } from "@meetup-automation/event";
import { EventDomainComposition } from "@meetup-automation/event";
import {
	CommunityGroupUrl,
	MeetupGroupUrl,
	ScheduledEventError,
} from "@meetup-automation/publication";
import { describe, expect, it, vi } from "vitest";
import {
	communityFixture,
	remote,
} from "../../testing/community-publication.fixtures.js";
import { event, identity } from "../../testing/meetup-journey.fixtures.js";
import {
	publicationIdentity,
	publicationUrl,
	publicationFixture as setupPublication,
} from "../../testing/meetup-publication.fixtures.js";
import { JourneyPolicyComposition } from "../policy-composition.js";
import { PublicationDestinationComposition } from "../publication-destination-composition.js";
import type {
	EventPublicationSourceDependencies,
	PublicationDestination,
	PublicationFollowUp,
} from "./event-publication-contracts.js";
import { EventPublicationSource } from "./event-publication-source.js";
import { ReconcileEventPublications } from "./reconcile-event-publications.js";

function collection(
	dependencies: EventPublicationSourceDependencies,
	destinations: readonly PublicationDestination[],
	followUps: readonly PublicationFollowUp[] = [],
) {
	return new ReconcileEventPublications(
		dependencies.repository,
		(document) =>
			new EventPublicationSource(
				{
					concurrency: new EventDomainComposition().eventDocumentConcurrency(),
					patches: new EventDomainComposition().eventRepositoryPatches(),
					diagnostics: new JourneyPolicyComposition().diagnosticPolicy(),
				},
				dependencies,
				document,
			),
		destinations,
		followUps,
	);
}
function publicationFixture(...args: Parameters<typeof setupPublication>) {
	const fixture = setupPublication(...args);
	return {
		...fixture,
		useCase: {
			async execute(identity: EventIdentity) {
				const group = MeetupGroupUrl.fromEventUrlPrefix(
					fixture.dependencies.meetupUrlPrefix,
				);
				if (!group) throw new Error("Invalid fixture group");
				const result = await collection(fixture.dependencies, [
					new PublicationDestinationComposition().meetup(
						fixture.dependencies,
						group,
					),
				]).execute(identity);
				return result.publications[0];
			},
		},
	};
}
function communityPublicationFixture(
	...args: Parameters<typeof communityFixture>
) {
	const fixture = communityFixture(...args);
	return {
		...fixture,
		useCase: {
			async execute(identity: EventIdentity) {
				const group = CommunityGroupUrl.parse(
					"https://community.example.test/cncf/group/example/event/",
				);
				if (!group) throw new Error("Invalid fixture group");
				const result = await collection(fixture.dependencies, [
					new PublicationDestinationComposition().community(
						fixture.dependencies,
						group,
					),
				]).execute(identity);
				return result.publications[0];
			},
		},
	};
}
describe("Meetup event publication", () => {
	it("blocks browser access when the approved cover is absent", async () => {
		// Arrange
		const f = publicationFixture();
		f.dependencies.artwork.cover.mockResolvedValue(undefined);
		// Act
		const result = await f.useCase.execute(identity);
		// Assert
		expect(result.status).toBe("blocked");
		expect(f.gateway.save).not.toHaveBeenCalled();
		expect(f.approval.request).not.toHaveBeenCalled();
	});
	it("rechecks artwork authorization before reserving the draft", async () => {
		// Arrange
		const f = publicationFixture();
		const cover = await f.dependencies.artwork.cover();
		f.dependencies.artwork.cover
			.mockResolvedValue(undefined)
			.mockResolvedValueOnce(cover);
		// Act
		const result = await f.useCase.execute(identity);
		// Assert
		expect(result.status).toBe("blocked");
		expect(f.journal.reserve).not.toHaveBeenCalled();
		expect(f.approval.request).not.toHaveBeenCalled();
	});
	it("runs post-event delivery when event editing is inactive", async () => {
		// Arrange
		const f = setupPublication({ occurrenceStatus: "held" });
		const group = MeetupGroupUrl.fromEventUrlPrefix(
			f.dependencies.meetupUrlPrefix,
		);
		if (!group) throw new Error("Invalid fixture group");
		const destination = new PublicationDestinationComposition().meetup(
			f.dependencies,
			group,
		);
		const followUp = {
			key: destination.key,
			execute: vi.fn<PublicationFollowUp["execute"]>().mockResolvedValue({
				status: "updated",
				diagnostics: [],
			}),
		};
		const useCase = collection(f.dependencies, [destination], [followUp]);

		// Act
		const result = await useCase.execute(identity);

		// Assert
		expect(f.gateway.save).not.toHaveBeenCalled();
		expect(followUp.execute).toHaveBeenCalledWith(identity);
		expect(result.publications.map((item) => item.status)).toEqual([
			"skipped",
			"updated",
		]);
	});

	it("records a draft and requests approval using the configured origin", async () => {
		// Arrange
		const { useCase, dependencies, gateway, journal, approval } =
			publicationFixture();
		const prefix = "https://events.example.test:8443/example-group/events/";
		const url = `${prefix}12345/`;
		dependencies.meetupUrlPrefix = prefix;
		gateway.save.mockImplementation(async (_, __, before, after) => {
			await before("event");
			await after(publicationIdentity(url));
			return { identity: publicationIdentity(url), status: "draft" };
		});

		// Act
		const result = await useCase.execute(identity);

		// Assert
		expect(result).toMatchObject({ status: "draft", reviewUrl: url });
		expect(journal.record).toHaveBeenCalledWith(publicationIdentity(url));
		expect(approval.request).toHaveBeenCalledWith(
			expect.objectContaining({
				publication: expect.objectContaining({ url }),
			}),
		);
		expect(gateway.publish).not.toHaveBeenCalled();
	});

	it.each([
		"https://www.meetup.com/example-group/events/12345/",
		"https://events.example.test/example-group/events/12345/",
		"https://events.example.test:8443/other-group/events/12345/",
	])(
		"blocks event links outside the configured origin and group: %s",
		async (url) => {
			// Arrange
			const { useCase, dependencies, gateway, approval } = publicationFixture({
				publicationLinks: { meetup: url },
			});
			dependencies.meetupUrlPrefix =
				"https://events.example.test:8443/example-group/events/";

			// Act
			const result = await useCase.execute(identity);

			// Assert
			expect(result.status).toBe("blocked");
			expect(gateway.save).not.toHaveBeenCalled();
			expect(gateway.publish).not.toHaveBeenCalled();
			expect(approval.request).not.toHaveBeenCalled();
		},
	);

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
				description: "An evening about cloud-native technology",
			}),
			undefined,
			expect.any(Function),
			expect.any(Function),
		);
		expect(journal.reserve.mock.invocationCallOrder[0]).toBeLessThan(
			journal.record.mock.invocationCallOrder[0],
		);
		expect(journal.record).toHaveBeenCalledWith(publicationIdentity());
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
		expect(gateway.save.mock.calls[0]?.[1]).toEqual(publicationIdentity());
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
			{ identity: publicationIdentity() },
		);
		gateway.inspect.mockResolvedValue({
			identity: publicationIdentity(),
			status: "draft",
		});
		gateway.save.mockImplementation(async (_, url, before, after) => {
			await before("event");
			await after(url ?? publicationIdentity());
			return { identity: url ?? publicationIdentity(), status: "draft" };
		});

		// Act
		const first = await useCase.execute(identity);
		const second = await useCase.execute(identity);

		// Assert
		expect(first.status).toBe("draft");
		expect(second.status).toBe("draft");
		expect(second.reviewUrl).toBe(publicationUrl);
		expect(
			gateway.save.mock.calls.every(
				(call) => call[1]?.reviewUrl === publicationUrl,
			),
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
			{ identity: publicationIdentity() },
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
			await before("event");
			await after(publicationIdentity());
			return { identity: publicationIdentity(), status: "draft" };
		});

		// Act
		const result = await useCase.execute(identity);

		// Assert
		expect(result.status).toBe("draft");
		expect(journal.record).toHaveBeenCalledWith(publicationIdentity());
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
			await before("event");
			await after(publicationIdentity());
			return { identity: publicationIdentity(), status: "published" };
		});

		// Act
		const result = await useCase.execute(identity);

		// Assert
		expect(result.diagnostics[0]?.code).toBe("publication.meetup.verification");
		expect(journal.record).toHaveBeenCalledWith(publicationIdentity());
		expect(deps.repository.applyPatch).not.toHaveBeenCalled();
	});

	it("recovers a created event after an interrupted issue patch", async () => {
		// Arrange
		const { useCase, gateway, journal } = publicationFixture(
			{},
			{ identity: publicationIdentity() },
		);

		// Act
		const result = await useCase.execute(identity);

		// Assert
		expect(result.status).toBe("updated");
		expect(gateway.save.mock.calls[0]?.[1]).toEqual(publicationIdentity());
		expect(journal.reserve).not.toHaveBeenCalled();
	});

	it("blocks an uncertain creation on every rerun without creating another draft", async () => {
		// Arrange
		const { useCase, gateway, journal } = publicationFixture();
		gateway.save.mockImplementation(async (_, _url, before) => {
			await before("event");
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
		{ host: undefined },
		{ confirmations: { speakers: false } },
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
			{ identity: publicationIdentity() },
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
			{ identity: publicationIdentity() },
		);

		// Act
		const result = await useCase.execute(identity);

		// Assert
		expect(result.status).toBe("updated");
		expect(gateway.save.mock.calls[0]?.[1]).toEqual(publicationIdentity());
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
				{ identity: publicationIdentity(url) },
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
			await before("event");
			await after(publicationIdentity());
			throw new ScheduledEventError("verification");
		});

		// Act
		const result = await useCase.execute(identity);

		// Assert
		expect(result.diagnostics[0]?.code).toBe("publication.meetup.verification");
		expect(journal.record).toHaveBeenCalledWith(publicationIdentity());
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
		gateway.publish.mockResolvedValue({
			identity: publicationIdentity(),
			status: "draft",
		});

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

describe("community publication", () => {
	it("journals a draft and requests a separate approval while CNCF Link remains empty", async () => {
		// Arrange
		const f = communityPublicationFixture({
			publicationLinks: {
				meetup: "https://www.meetup.com/example/events/123/",
			},
		});
		// Act
		const result = await f.useCase.execute(identity);
		// Assert
		expect(result).toMatchObject({
			status: "draft",
			reviewUrl: remote.reviewUrl,
		});
		expect(f.journal.reserve).toHaveBeenCalledOnce();
		expect(f.journal.record).toHaveBeenCalledWith(remote);
		expect(f.currentEvent.publicationLinks).toEqual({
			meetup: "https://www.meetup.com/example/events/123/",
		});
		expect(f.approval.request).toHaveBeenCalledWith(
			expect.objectContaining({
				kind: "community-publication",
				publication: expect.objectContaining({ url: remote.reviewUrl }),
			}),
		);
		expect(f.gateway.publish).not.toHaveBeenCalled();
	});
	it("publishes only after rechecking approval and persists the verified public URL", async () => {
		// Arrange
		const f = communityPublicationFixture();
		f.approval.request.mockResolvedValue({
			status: "approved",
			notificationFailed: false,
		});
		// Act
		const result = await f.useCase.execute(identity);
		// Assert
		expect(result.status).toBe("updated");
		expect(f.approval.request).toHaveBeenCalledTimes(2);
		expect(f.currentEvent.publicationLinks.community).toBe(remote.publicUrl);
		expect(f.currentEvent.operationalChecklists.communication).toEqual(
			f.dependencies.codec.decode(f.current).event.operationalChecklists
				.communication,
		);
	});
	it("recovers a supplied draft into the journal and clears CNCF Link before approval", async () => {
		// Arrange
		const f = communityPublicationFixture({
			publicationLinks: { community: remote.publicUrl },
		});
		f.approval.request.mockImplementation(async () => {
			expect(f.currentEvent.publicationLinks.community).toBeUndefined();
			return { status: "pending", notificationFailed: false };
		});
		// Act
		const result = await f.useCase.execute(identity);
		// Assert
		expect(result.status).toBe("draft");
		expect(f.journal.reserve).not.toHaveBeenCalled();
		expect(f.journal.record.mock.invocationCallOrder[0]).toBeLessThan(
			vi.mocked(f.deps.repository.applyPatch).mock.invocationCallOrder[0],
		);
	});
	it("reuses the recorded draft on repeated runs without creating another event", async () => {
		// Arrange
		const f = communityPublicationFixture({}, { identity: remote });
		// Act
		await f.useCase.execute(identity);
		const result = await f.useCase.execute(identity);
		// Assert
		expect(result.status).toBe("draft");
		expect(f.gateway.save.mock.calls.map((call) => call[1])).toEqual([
			remote,
			remote,
		]);
		expect(f.journal.reserve).not.toHaveBeenCalled();
	});
	it("blocks an uncertain reservation without an identity", async () => {
		// Arrange
		const f = communityPublicationFixture({}, {});
		// Act
		const result = await f.useCase.execute(identity);
		// Assert
		expect(result.diagnostics[0]?.code).toBe("publication.community.uncertain");
		expect(f.gateway.save).not.toHaveBeenCalled();
	});
	it("retains the observed UUID when saved field verification fails", async () => {
		// Arrange
		const f = communityPublicationFixture();
		f.gateway.save.mockImplementation(async (_, __, before, after) => {
			await before("event");
			await after({ id: remote.id, reviewUrl: remote.reviewUrl });
			throw new ScheduledEventError("verification");
		});
		// Act
		const result = await f.useCase.execute(identity);
		const record = await f.journal.load();
		// Assert
		expect(result.status).toBe("blocked");
		expect(record?.identity?.id).toBe(remote.id);
		expect(f.currentEvent.publicationLinks.community).toBeUndefined();
		expect(f.approval.request).not.toHaveBeenCalled();
	});
	it("rejects a supplied event that conflicts with the recorded UUID", async () => {
		// Arrange
		const f = communityPublicationFixture(
			{ publicationLinks: { community: remote.publicUrl } },
			{ identity: { ...remote, id: "10000000-0000-4000-8000-000000000003" } },
		);
		// Act
		const result = await f.useCase.execute(identity);
		// Assert
		expect(result.status).toBe("blocked");
		expect(f.gateway.save).not.toHaveBeenCalled();
	});
	it.each([
		"https://other.example.test/cncf/group/example/event/example",
		"https://community.example.test/cncf/group/other/event/example",
		remote.reviewUrl,
	])("rejects an out-of-scope public link %s", async (community) => {
		// Arrange
		const f = communityPublicationFixture({ publicationLinks: { community } });
		// Act
		const result = await f.useCase.execute(identity);
		// Assert
		expect(result.status).toBe("blocked");
		expect(f.gateway.inspect).not.toHaveBeenCalled();
		expect(f.gateway.save).not.toHaveBeenCalled();
	});
	it("recovers a changed public slug through the recorded UUID", async () => {
		// Arrange
		const f = communityPublicationFixture(
			{ publicationLinks: { community: remote.publicUrl } },
			{ identity: remote },
		);
		const renamed = { ...remote, publicUrl: `${remote.publicUrl}-renamed` };
		f.gateway.inspect.mockResolvedValue({
			identity: renamed,
			status: "published",
		});
		f.gateway.save.mockResolvedValue({
			identity: renamed,
			status: "published",
		});
		// Act
		const result = await f.useCase.execute(identity);
		// Assert
		expect(result.status).toBe("updated");
		expect(f.gateway.inspect).toHaveBeenCalledExactlyOnceWith(remote.reviewUrl);
		expect(f.currentEvent.publicationLinks.community).toBe(renamed.publicUrl);
		expect(f.journal.reserve).not.toHaveBeenCalled();
	});

	it("updates a published event without a new publication approval", async () => {
		// Arrange
		const f = communityPublicationFixture({}, { identity: remote });
		f.gateway.save.mockResolvedValue({ identity: remote, status: "published" });
		// Act
		const result = await f.useCase.execute(identity);
		// Assert
		expect(result.status).toBe("updated");
		expect(f.approval.request).not.toHaveBeenCalled();
		expect(f.gateway.publish).not.toHaveBeenCalled();
		expect(f.currentEvent.publicationLinks.community).toBe(remote.publicUrl);
	});
	it("blocks a revoked approval at the final publish guard", async () => {
		// Arrange
		const f = communityPublicationFixture();
		f.approval.request
			.mockResolvedValueOnce({ status: "approved", notificationFailed: false })
			.mockResolvedValueOnce({ status: "rejected", notificationFailed: false });
		const write = vi.fn();
		f.gateway.publish.mockImplementation(async (_, identity, guard) => {
			await guard();
			write();
			return { identity, status: "published" };
		});
		// Act
		const result = await f.useCase.execute(identity);
		// Assert
		expect(result.status).toBe("blocked");
		expect(write).not.toHaveBeenCalled();
		expect(f.currentEvent.publicationLinks.community).toBeUndefined();
	});
	it("rejects a changed issue before creating the remote draft", async () => {
		// Arrange
		const f = communityPublicationFixture();
		vi.mocked(f.deps.repository.find)
			.mockResolvedValueOnce(f.current)
			.mockResolvedValue({ ...f.current, body: "Concurrent organizer edit" });
		// Act
		const result = f.useCase.execute(identity);
		// Assert
		await expect(result).rejects.toThrow();
		expect(f.journal.reserve).not.toHaveBeenCalled();
		expect(f.journal.record).not.toHaveBeenCalled();
	});
	it.each(["cancelled", "postponed", "held"] as const)(
		"skips %s events",
		async (occurrenceStatus) => {
			// Arrange
			const f = communityPublicationFixture({ occurrenceStatus });
			// Act
			const result = await f.useCase.execute(identity);
			// Assert
			expect(result.status).toBe("skipped");
			expect(f.gateway.save).not.toHaveBeenCalled();
		},
	);
	it("blocks publication after public content approval becomes stale", async () => {
		// Arrange
		const f = communityPublicationFixture();
		f.dependencies.contentGate.blocked.mockResolvedValue([{}]);
		// Act
		const result = await f.useCase.execute(identity);
		// Assert
		expect(result.status).toBe("blocked");
		expect(f.gateway.save).not.toHaveBeenCalled();
	});
	it("never writes an unverified published URL", async () => {
		// Arrange
		const f = communityPublicationFixture();
		f.approval.request.mockResolvedValue({
			status: "approved",
			notificationFailed: false,
		});
		f.gateway.publish.mockResolvedValue({
			identity: { id: remote.id, reviewUrl: remote.reviewUrl },
			status: "published",
		});
		// Act
		const result = await f.useCase.execute(identity);
		// Assert
		expect(result.status).toBe("blocked");
		expect(f.currentEvent.publicationLinks.community).toBeUndefined();
	});
});

function multipleDestinations(overrides: Partial<MeetupEvent> = {}) {
	const meetup = setupPublication(overrides);
	const community = communityFixture();
	const meetupGroup = MeetupGroupUrl.fromEventUrlPrefix(
		meetup.dependencies.meetupUrlPrefix,
	);
	const communityGroup = CommunityGroupUrl.parse(
		"https://community.example.test/cncf/group/example/event/",
	);
	if (!meetupGroup || !communityGroup)
		throw new Error("Invalid fixture groups");
	const composition = new PublicationDestinationComposition();
	const destinations = [
		composition.meetup(meetup.dependencies, meetupGroup),
		composition.community(community.dependencies, communityGroup),
	];
	return {
		meetup,
		community,
		destinations,
		useCase: collection(meetup.dependencies, destinations),
	};
}

describe("publication destination collection", () => {
	it("publishes OCGroups while Meetup awaits its own approval and preserves both projections", async () => {
		// Arrange
		const f = multipleDestinations();
		f.community.approval.request.mockResolvedValue({
			status: "approved",
			notificationFailed: false,
		});
		// Act
		const result = await f.useCase.execute(identity);
		// Assert
		expect(
			result.publications.map((item) => [
				item.destination.provider,
				item.status,
			]),
		).toEqual([
			["meetup", "draft"],
			["ocgroups", "updated"],
		]);
		expect(f.meetup.currentEvent.publicationLinks).toEqual({
			meetup: publicationUrl,
			community: remote.publicUrl,
		});
		expect(
			f.meetup.currentEvent.operationalChecklists.communication,
		).toContainEqual({ name: "Meetup event published", completed: false });
		expect(f.meetup.gateway.publish).not.toHaveBeenCalled();
		expect(f.community.gateway.publish).toHaveBeenCalledOnce();
		expect(f.meetup.approval.request.mock.calls[0]?.[0].kind).toBe(
			"meetup-publication",
		);
		expect(f.community.approval.request.mock.calls[0]?.[0].kind).toBe(
			"community-publication",
		);
		expect(f.meetup.gateway.save.mock.invocationCallOrder[0]).toBeLessThan(
			f.community.gateway.save.mock.invocationCallOrder[0],
		);
	});

	it.each([
		new ScheduledEventError("unavailable"),
		new Error("private provider failure"),
	])(
		"continues other destinations after a provider failure without exposing its details",
		async (error) => {
			// Arrange
			const f = multipleDestinations({
				publicationLinks: { meetup: publicationUrl },
			});
			f.meetup.gateway.save.mockRejectedValue(error);
			// Act
			const result = await f.useCase.execute(identity);
			// Assert
			expect(result.publications.map((item) => item.status)).toEqual([
				"blocked",
				"draft",
			]);
			expect(result.diagnostics).toContainEqual(
				expect.objectContaining({
					code: "publication.meetup.unavailable",
					severity: "error",
				}),
			);
			expect(JSON.stringify(result)).not.toContain("private provider failure");
			expect(f.community.journal.reserve).toHaveBeenCalledOnce();
		},
	);

	it("does not recreate an uncertain Meetup draft or create OCGroups without its link", async () => {
		// Arrange
		const f = multipleDestinations();
		f.meetup.gateway.save.mockImplementation(async (_, __, guard) => {
			await guard("event");
			throw new ScheduledEventError("uncertain");
		});
		// Act
		await f.useCase.execute(identity);
		const repeated = await f.useCase.execute(identity);
		// Assert
		expect(repeated.publications.map((item) => item.status)).toEqual([
			"blocked",
			"blocked",
		]);
		expect(f.meetup.gateway.save).toHaveBeenCalledOnce();
		expect(f.meetup.journal.reserve).toHaveBeenCalledOnce();
		expect(f.community.journal.reserve).not.toHaveBeenCalled();
		expect(f.community.gateway.save).not.toHaveBeenCalled();
	});

	it("stops the collection if the source changes during a destination operation", async () => {
		// Arrange
		const f = multipleDestinations();
		f.meetup.gateway.save.mockImplementation(async () => {
			Object.assign(f.meetup.current, { body: "Changed by an organizer" });
			throw new ScheduledEventError("editor");
		});
		// Act
		const result = f.useCase.execute(identity);
		// Assert
		await expect(result).rejects.toThrow();
		expect(f.community.gateway.save).not.toHaveBeenCalled();
		expect(f.community.journal.reserve).not.toHaveBeenCalled();
	});

	it("evaluates shared readiness before any destination writes", async () => {
		// Arrange
		const f = multipleDestinations();
		f.meetup.dependencies.contentGate.blocked.mockResolvedValue(["pending"]);
		// Act
		const result = await f.useCase.execute(identity);
		// Assert
		expect(result.publications.map((item) => item.status)).toEqual([
			"blocked",
			"blocked",
		]);
		expect(f.meetup.gateway.save).not.toHaveBeenCalled();
		expect(f.community.gateway.save).not.toHaveBeenCalled();
	});

	it("rejects duplicate destinations before remote effects", () => {
		// Arrange
		const f = multipleDestinations();
		// Act
		const create = () =>
			collection(f.meetup.dependencies, [f.destinations[0], f.destinations[0]]);
		// Assert
		expect(create).toThrow("Duplicate publication destination");
		expect(f.meetup.gateway.save).not.toHaveBeenCalled();
	});
});

describe("publication source preservation", () => {
	it("uses enriched content remotely while preserving unrelated issue fields across destinations", async () => {
		// Arrange
		const f = multipleDestinations();
		const originalTitle = f.meetup.currentEvent.eventTitle;
		const evaluation = await f.meetup.manageEvent.execute({
			identity,
			mode: "check",
		});
		if (evaluation.skipped) throw new Error("Expected a ready fixture");
		f.meetup.manageEvent.execute.mockResolvedValue({
			...evaluation,
			event: { ...evaluation.event, eventTitle: "Resolved public title" },
		});
		// Act
		await f.useCase.execute(identity);
		// Assert
		expect(f.meetup.gateway.save.mock.calls[0]?.[0].title).toBe(
			"Resolved public title",
		);
		expect(f.community.gateway.save.mock.calls[0]?.[0].title).toBe(
			"Resolved public title",
		);
		expect(f.meetup.currentEvent.eventTitle).toBe(originalTitle);
		expect(f.meetup.currentEvent.publicationLinks.meetup).toBe(publicationUrl);
	});
});

describe("destination recovery boundaries", () => {
	it("requires the OCGroups journal identity even when an uncertain creation has a supplied public link", async () => {
		// Arrange
		const f = communityPublicationFixture(
			{ publicationLinks: { community: remote.publicUrl } },
			{},
		);
		// Act
		const result = await f.useCase.execute(identity);
		// Assert
		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({ code: "publication.community.uncertain" }),
		);
		expect(f.gateway.inspect).not.toHaveBeenCalled();
		expect(f.gateway.save).not.toHaveBeenCalled();
	});
	it("rejects two targets that would overwrite the same issue field", () => {
		// Arrange
		const f = multipleDestinations();
		const group = MeetupGroupUrl.parse("https://www.meetup.com/other-group/");
		if (!group) throw new Error("Invalid fixture group");
		const other = new PublicationDestinationComposition().meetup(
			f.meetup.dependencies,
			group,
		);
		// Act
		const create = () =>
			collection(f.meetup.dependencies, [f.destinations[0], other]);
		// Assert
		expect(create).toThrow("distinct issue fields");
	});
});
