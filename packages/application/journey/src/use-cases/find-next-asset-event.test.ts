import { describe, expect, it, vi } from "vitest";
import type { MeetupEvent } from "@meetup-automation/event";
import type { HostId } from "@meetup-automation/referential";
import { FindNextAssetEvent } from "./find-next-asset-event.js";
import { event } from "../../testing/meetup-journey.fixtures.js";
import {
	nextCandidate,
	nextEventFixture,
	publicCatalog,
} from "../../testing/asset-render.fixtures.js";

describe("next public meetup for assets", () => {
	it("selects the earliest later published meetup across all pages", async () => {
		// Arrange
		const f = nextEventFixture([
			nextCandidate(45, { date: "2026-12-01" }),
			nextCandidate(43),
		]);
		vi.mocked(f.repository.listPage)
			.mockResolvedValueOnce({ items: [f.documents[0]], nextCursor: "page2" })
			.mockResolvedValueOnce({ items: [f.documents[1]] });
		const finder = new FindNextAssetEvent(f.repository, f.codec, {
			"host-0001": {
				address: "Public place",
				postalCode: "13001",
				city: "Marseille",
			},
		});

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
		{ host: { id: "host-missing", displayName: "Unresolved" } },
	])("ignores ineligible next meetups", async (override) => {
		// Arrange
		const f = nextEventFixture([nextCandidate(43, override)]);
		const finder = new FindNextAssetEvent(f.repository, f.codec);

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
		const finder = new FindNextAssetEvent(f.repository, f.codec);

		// Act
		const actual = await finder.find(event, {
			...publicCatalog,
			hosts: [...publicCatalog.hosts, extraHost],
		});

		// Assert
		expect(actual?.hostName).toBe("Public Host");
	});

	it.each(["failure", "repeated-cursor", "issue-limit", "page-limit"])(
		"does not select from incomplete data: %s",
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
			const finder = new FindNextAssetEvent(f.repository, f.codec);

			// Act
			const actual = await finder.find(event, publicCatalog);

			// Assert
			expect(actual).toBeUndefined();
		},
	);
});
