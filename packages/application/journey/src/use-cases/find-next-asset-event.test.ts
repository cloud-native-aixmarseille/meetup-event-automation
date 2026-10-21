import type { MeetupEvent } from "@meetup-automation/event";
import { EventDomainComposition } from "@meetup-automation/event";
import { PublicationDomainComposition } from "@meetup-automation/publication";
import type { HostId } from "@meetup-automation/referential";
import { describe, expect, it, vi } from "vitest";
import {
	nextCandidate,
	nextEventFixture,
	publicCatalog,
} from "../../testing/asset-render.fixtures.js";
import {
	event,
	publicationUrls,
} from "../../testing/meetup-journey.fixtures.js";
import { FindNextAssetEvent } from "./find-next-asset-event.js";

describe("next public meetup for assets", () => {
	it.each([
		{ meetup: "https://www.meetup.com/regional-group/events/123/" },
		{
			community: "https://ocgroups.dev/cncf/group/regional-group/event/evening",
		},
		{
			community: "https://regional.example.test/events/evening",
		},
	])(
		"uses configured group identities and event labels: %j",
		async (publicationLinks) => {
			// Arrange
			const eventLabel = "community-event";
			const candidate = nextCandidate(43, {
				labels: [
					...event.labels.filter((label) => label !== "meetup"),
					eventLabel,
				],
				publicationLinks,
				operationalChecklists: {
					...event.operationalChecklists,
					communication: [{ name: "Meetup event published", completed: true }],
				},
			});
			const f = nextEventFixture([candidate]);
			const finder = new FindNextAssetEvent(
				{
					eventRuleFactory: new EventDomainComposition().eventRuleFactory(),
					publicationUrlPolicies:
						new PublicationDomainComposition().publicationUrlPolicies(),
					meetupPublicationChecklist:
						new EventDomainComposition().meetupPublicationChecklist(),
					createEventRuleEngine: (...args) =>
						new EventDomainComposition().eventRuleEngine(...args),
				},
				f.repository,
				f.codec,
				eventLabel,
				{
					meetupEventUrlPrefix: "https://www.meetup.com/regional-group/events/",
					communityEventUrlPrefixes: [
						"https://ocgroups.dev/cncf/group/regional-group/event/",
						"https://regional.example.test/events/",
					],
					assetFolderUrlPrefix: publicationUrls.assetFolderUrlPrefix,
				},
			);

			// Act
			const result = await finder.find(event, publicCatalog);

			// Assert
			expect(result?.hostName).toBe("Public Host");
			expect(f.repository.listPage).toHaveBeenCalledWith(
				expect.objectContaining({ label: eventLabel }),
			);
		},
	);

	it("selects the earliest later published meetup across all pages", async () => {
		// Arrange
		const f = nextEventFixture([
			nextCandidate(45, { date: "2026-12-01" }),
			nextCandidate(43),
		]);
		vi.mocked(f.repository.listPage)
			.mockResolvedValueOnce({ items: [f.documents[0]], nextCursor: "page2" })
			.mockResolvedValueOnce({ items: [f.documents[1]] });
		const finder = new FindNextAssetEvent(
			{
				eventRuleFactory: new EventDomainComposition().eventRuleFactory(),
				publicationUrlPolicies:
					new PublicationDomainComposition().publicationUrlPolicies(),
				meetupPublicationChecklist:
					new EventDomainComposition().meetupPublicationChecklist(),
				createEventRuleEngine: (...args) =>
					new EventDomainComposition().eventRuleEngine(...args),
			},
			f.repository,
			f.codec,
			"meetup",
			publicationUrls,
			{
				"host-0001": {
					address: "Public place",
					postalCode: "13001",
					city: "Marseille",
				},
			},
		);

		// Act
		const actual = await finder.find(event, publicCatalog);

		// Assert
		expect(actual).toEqual({
			date: "2026-10-15",
			hostName: "Public Host",
			city: "Marseille",
		});
		expect(f.repository.listPage).toHaveBeenCalledTimes(2);
		expect(f.repository.applyPatch).not.toHaveBeenCalled();
		expect(JSON.stringify(actual)).not.toContain("Private contact address");
	});

	it.each<Partial<MeetupEvent>>([
		{ date: event.date },
		{ date: "2026-01-01" },
		{ date: "2026-02-30" },
		{ occurrenceStatus: "cancelled" },
		{ occurrenceStatus: "postponed" },
		{ occurrenceStatus: "held" },
		{ issueState: "closed" },
		{ labels: [] },
		{ host: undefined },
		{ confirmations: { host: false, speakers: true } },
		{ publicationLinks: {} },
		{ publicationLinks: { meetup: "https://example.test/not-a-meetup" } },
		{
			publicationLinks: {
				community:
					"https://community.cncf.io/events/details/cncf-cloud-native-aix-marseille-presents-platform-engineering",
			},
		},
		{ host: { id: "host-missing", displayName: "Unresolved" } },
	])("ignores ineligible next meetups", async (override) => {
		// Arrange
		const f = nextEventFixture([nextCandidate(43, override)]);
		const finder = new FindNextAssetEvent(
			{
				eventRuleFactory: new EventDomainComposition().eventRuleFactory(),
				publicationUrlPolicies:
					new PublicationDomainComposition().publicationUrlPolicies(),
				meetupPublicationChecklist:
					new EventDomainComposition().meetupPublicationChecklist(),
				createEventRuleEngine: (...args) =>
					new EventDomainComposition().eventRuleEngine(...args),
			},
			f.repository,
			f.codec,
			"meetup",
			publicationUrls,
		);

		// Act
		const actual = await finder.find(event, publicCatalog);

		// Assert
		expect(actual).toBeUndefined();
	});

	it("breaks same-date ties by issue number", async () => {
		// Arrange
		const extraHost = {
			...publicCatalog.hosts[0],
			id: "host-0002" as HostId,
			displayName: "Second Host",
		};
		const f = nextEventFixture([
			nextCandidate(44, {
				host: { id: extraHost.id, displayName: extraHost.displayName },
			}),
			nextCandidate(43),
		]);
		const finder = new FindNextAssetEvent(
			{
				eventRuleFactory: new EventDomainComposition().eventRuleFactory(),
				publicationUrlPolicies:
					new PublicationDomainComposition().publicationUrlPolicies(),
				meetupPublicationChecklist:
					new EventDomainComposition().meetupPublicationChecklist(),
				createEventRuleEngine: (...args) =>
					new EventDomainComposition().eventRuleEngine(...args),
			},
			f.repository,
			f.codec,
			"meetup",
			publicationUrls,
		);

		// Act
		const actual = await finder.find(event, {
			...publicCatalog,
			hosts: [...publicCatalog.hosts, extraHost],
		});

		// Assert
		expect(actual?.hostName).toBe("Public Host");
	});

	it.each(["failure", "repeated-cursor", "issue-limit", "page-limit"])(
		"reports a technical failure for incomplete data: %s",
		async (failure) => {
			// Arrange
			const f = nextEventFixture([nextCandidate()]);
			if (failure === "failure")
				vi.mocked(f.repository.listPage).mockRejectedValue(
					new Error("private provider error"),
				);
			if (failure === "repeated-cursor")
				vi.mocked(f.repository.listPage).mockResolvedValue({
					items: f.documents,
					nextCursor: "same",
				});
			if (failure === "issue-limit")
				vi.mocked(f.repository.listPage).mockResolvedValue({
					items: Array.from({ length: 201 }, (_, i) => ({
						...f.documents[0],
						identity: { ...event.identity, issueNumber: i + 100 },
					})),
				});
			if (failure === "page-limit")
				vi.mocked(f.repository.listPage).mockImplementation(
					async ({ cursor }) => ({
						items: [],
						nextCursor: String(Number(cursor ?? 0) + 1),
					}),
				);
			const finder = new FindNextAssetEvent(
				{
					eventRuleFactory: new EventDomainComposition().eventRuleFactory(),
					publicationUrlPolicies:
						new PublicationDomainComposition().publicationUrlPolicies(),
					meetupPublicationChecklist:
						new EventDomainComposition().meetupPublicationChecklist(),
					createEventRuleEngine: (...args) =>
						new EventDomainComposition().eventRuleEngine(...args),
				},
				f.repository,
				f.codec,
				"meetup",
				publicationUrls,
			);
			let error: unknown;

			// Act
			try {
				await finder.find(event, publicCatalog);
			} catch (caught) {
				error = caught;
			}

			// Assert
			expect(error).toBeInstanceOf(Error);
		},
	);
	it.each([false, true])(
		"requires publication before promoting a Meetup-only event: %s",
		async (completed) => {
			// Arrange
			const candidate = nextCandidate(43, {
				publicationLinks: { meetup: event.publicationLinks.meetup },
				operationalChecklists: {
					...event.operationalChecklists,
					communication: [{ name: "Meetup event published", completed }],
				},
			});
			const f = nextEventFixture([candidate]);
			const finder = new FindNextAssetEvent(
				{
					eventRuleFactory: new EventDomainComposition().eventRuleFactory(),
					publicationUrlPolicies:
						new PublicationDomainComposition().publicationUrlPolicies(),
					meetupPublicationChecklist:
						new EventDomainComposition().meetupPublicationChecklist(),
					createEventRuleEngine: (...args) =>
						new EventDomainComposition().eventRuleEngine(...args),
				},
				f.repository,
				f.codec,
				"meetup",
				publicationUrls,
			);

			// Act
			const result = await finder.find(event, publicCatalog);

			// Assert
			expect(Boolean(result)).toBe(completed);
		},
	);
});
