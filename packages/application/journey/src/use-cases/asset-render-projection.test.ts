import { describe, expect, it, vi } from "vitest";
import type { AssetRenderPresenter } from "@meetup-automation/publication";
import { catalog, event } from "../../testing/meetup-journey.fixtures.js";
import { AssetRenderProjection } from "./asset-render-projection.js";
import { talk } from "../../testing/asset-render.fixtures.js";

describe("asset public projection", () => {
	it.each([
		"resolved",
		"stale-agenda",
		"unresolved",
		"removed",
		"unconfigured",
		"unsafe-url",
		"invalid-catalog",
	])("projects the current host's public logo only when %s", async (reason) => {
		// Arrange
		const logo = {
			url:
				reason === "unsafe-url"
					? "https://images.example.org/logo.png?token=private"
					: "https://images.example.org/logo.png",
			description: "Example host logo",
		};
		const presenter: AssetRenderPresenter = {
			format: vi.fn(() => ({ text: {}, pictures: {} })),
		};
		const projection = new AssetRenderProjection(
			presenter,
			{
				load: vi.fn(async () =>
					reason === "invalid-catalog"
						? { ...catalog, hosts: [...catalog.hosts, ...catalog.hosts] }
						: catalog,
				),
			},
			{
				speakers: {},
				talks: {},
				venues: {},
				hostLogos:
					reason === "unconfigured"
						? {}
						: { "host-0001": logo, "host-unknown": logo },
			},
		);
		const host =
			reason === "removed"
				? undefined
				: reason === "unresolved"
					? { id: "host-unknown", displayName: "Unknown" }
					: event.host;

		// Act
		await projection.create(
			{
				...event,
				host,
				proposalStatus: reason === "stale-agenda" ? "stale" : "current",
			},
			[],
		);
		const payload = vi.mocked(presenter.format).mock.calls[0][0];

		// Assert
		expect(payload.hostLogo).toEqual(
			["resolved", "stale-agenda"].includes(reason)
				? { ...logo, hostId: "host-0001" }
				: undefined,
		);
		expect(JSON.stringify(payload)).not.toContain(catalog.hosts[0].email);
		expect(JSON.stringify(payload)).not.toContain(catalog.hosts[0].address);
	});

	it.each(["stale", "invalid-agenda", "invalid-catalog"])(
		"withholds participant fields from %s data",
		async (reason) => {
			// Arrange
			const presenter: AssetRenderPresenter = {
				format: vi.fn(() => ({ text: {}, pictures: {} })),
			};
			const nextEvent = { find: vi.fn() };
			const projection = new AssetRenderProjection(
				presenter,
				{
					load: vi.fn(async () =>
						reason === "invalid-catalog"
							? {
									...catalog,
									speakers: [...catalog.speakers, ...catalog.speakers],
								}
							: catalog,
					),
				},
				{
					speakers: { portrait: "speaker-0001" },
					talks: {
						opening: {
							provider: "conference-hall",
							event: "public-cfp",
							id: "proposal-a",
						},
					},
					venues: {},
				},
				nextEvent,
			);

			// Act
			await projection.create(
				{
					...event,
					agenda: [talk],
					proposalStatus: reason === "stale" ? "stale" : "current",
				},
				reason === "invalid-agenda"
					? [
							{
								severity: "error",
								code: "event.agenda.invalid",
								message: "Invalid agenda",
								field: "agenda",
							},
						]
					: [],
			);
			const payload = vi.mocked(presenter.format).mock.calls[0][0];

			// Assert
			expect(payload).toMatchObject({
				agenda: [],
				talks: {},
				speakers: {},
				pictures: {},
			});
			if (reason === "invalid-catalog")
				expect(nextEvent.find).not.toHaveBeenCalled();
		},
	);

	it("projects explicit public venues and source abstracts without contact addresses", async () => {
		// Arrange
		const presenter: AssetRenderPresenter = {
			format: vi.fn(() => ({ text: {}, pictures: {} })),
		};
		const venue = {
			address: "Public venue address",
			postalCode: "13001",
			city: "Marseille",
		};
		const next = { date: "2026-11-01", hostName: "Next Host", city: "Aix" };
		const projection = new AssetRenderProjection(
			presenter,
			{ load: vi.fn(async () => catalog) },
			{
				speakers: { portrait: "speaker-0001" },
				talks: {
					opening: {
						provider: "conference-hall",
						event: "public-cfp",
						id: "proposal-a",
					},
				},
				venues: { "host-0001": venue },
			},
			{ find: vi.fn(async () => next) },
		);

		// Act
		await projection.create({ ...event, agenda: [talk] }, []);
		const payload = vi.mocked(presenter.format).mock.calls[0][0];

		// Assert
		expect(payload.venue).toEqual(venue);
		expect(payload.nextEvent).toEqual(next);
		expect(payload.talks?.opening).toMatchObject({
			title: "Public title",
			abstract: "Public abstract",
		});
		expect(payload.agenda[0].title).toBe("Public title");
		expect(JSON.stringify(payload)).not.toContain(catalog.hosts[0].address);
	});

	it("exposes only public fields and assigns pictures by stable agenda identity", async () => {
		// Arrange
		const source = {
			...catalog,
			speakers: catalog.speakers.map((speaker) => ({
				...speaker,
				pictureUrl: "https://images.example.org/portrait.png",
			})),
		};
		const presenter: AssetRenderPresenter = {
			format: vi.fn(() => ({ text: {}, pictures: {} })),
		};
		const projection = new AssetRenderProjection(
			presenter,
			{ load: vi.fn(async () => source) },
			{
				speakers: { portrait: "speaker-0001", absent: "speaker-9999" },
				talks: {},
				venues: {},
			},
		);
		// Act
		await projection.create(event, []);
		const payload = vi.mocked(presenter.format).mock.calls[0][0];
		// Assert
		expect(payload.pictures).toEqual({
			portrait: {
				speakerId: "speaker-0001",
				url: "https://images.example.org/portrait.png",
				description: "Example Speaker",
			},
		});
		expect(Object.keys(payload).sort()).toEqual([
			"agenda",
			"date",
			"feedbackUrl",
			"hostLogo",
			"hostName",
			"nextEvent",
			"pictures",
			"speakers",
			"talks",
			"timeZone",
			"title",
			"venue",
		]);
		for (const speaker of source.speakers)
			expect(JSON.stringify(payload)).not.toContain(speaker.email);
		for (const host of source.hosts)
			expect(JSON.stringify(payload)).not.toContain(String(host.address));
	});

	it("does not transfer a removed speaker's portrait to the next agenda speaker", async () => {
		// Arrange
		const presenter: AssetRenderPresenter = {
			format: vi.fn(() => ({ text: {}, pictures: {} })),
		};
		const projection = new AssetRenderProjection(
			presenter,
			{ load: vi.fn(async () => catalog) },
			{ speakers: { portrait: "speaker-0001" }, talks: {}, venues: {} },
		);
		// Act
		await projection.create({ ...event, agenda: [] }, []);
		// Assert
		expect(vi.mocked(presenter.format).mock.calls[0][0].pictures).toEqual({});
	});
});
