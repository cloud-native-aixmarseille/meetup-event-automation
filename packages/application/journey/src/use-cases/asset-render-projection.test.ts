import type { AssetRenderPresenter } from "@meetup-automation/publication";
import { PublicationDomainComposition } from "@meetup-automation/publication";
import { ReferentialDomainComposition } from "@meetup-automation/referential";
import { describe, expect, it, vi } from "vitest";
import { talk } from "../../testing/asset-render.fixtures.js";
import { catalog, event } from "../../testing/meetup-journey.fixtures.js";
import { JourneyPolicyComposition } from "../policy-composition.js";
import { AssetRenderProjection } from "./asset-render-projection.js";

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
			{
				assetParticipantProjection:
					new JourneyPolicyComposition().assetParticipantProjection(),
				publicAssetUrl: new PublicationDomainComposition().publicAssetUrl(),
				createValidateReferentialCatalog: (...args) =>
					new ReferentialDomainComposition().validateReferentialCatalog(
						...args,
					),
			},
			presenter,
			{
				load: vi.fn(async () =>
					reason === "invalid-catalog"
						? { ...catalog, hosts: [...catalog.hosts, ...catalog.hosts] }
						: {
								...catalog,
								hosts: catalog.hosts.map((host) => ({
									...host,
									...(reason === "unconfigured"
										? {}
										: { logoUrl: logo.url, logoDescription: logo.description }),
								})),
							},
				),
			},
			"19:15",
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
			true,
		);
		const payload = vi.mocked(presenter.format).mock.calls[0][0];

		// Assert
		expect(payload.hostLogo).toEqual(
			["resolved", "stale-agenda"].includes(reason)
				? { ...logo, hostId: "host-0001" }
				: undefined,
		);
		expect(JSON.stringify(payload)).not.toContain(catalog.hosts[0].email);
		expect(JSON.stringify(payload)).not.toContain(catalog.hosts[0].contactName);
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
				{
					assetParticipantProjection:
						new JourneyPolicyComposition().assetParticipantProjection(),
					publicAssetUrl: new PublicationDomainComposition().publicAssetUrl(),
					createValidateReferentialCatalog: (...args) =>
						new ReferentialDomainComposition().validateReferentialCatalog(
							...args,
						),
				},
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
				"19:15",
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
				true,
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

	it("projects explicit public venues and source abstracts without private contact details", async () => {
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
			{
				assetParticipantProjection:
					new JourneyPolicyComposition().assetParticipantProjection(),
				publicAssetUrl: new PublicationDomainComposition().publicAssetUrl(),
				createValidateReferentialCatalog: (...args) =>
					new ReferentialDomainComposition().validateReferentialCatalog(
						...args,
					),
			},
			presenter,
			{
				load: vi.fn(async () => ({
					...catalog,
					hosts: catalog.hosts.map((host) => ({
						...host,
						venueAddress: venue.address,
						venuePostalCode: venue.postalCode,
						venueCity: venue.city,
					})),
				})),
			},
			"19:15",
			{ find: vi.fn(async () => next) },
		);

		// Act
		await projection.create({ ...event, agenda: [talk] }, [], true);
		const payload = vi.mocked(presenter.format).mock.calls[0][0];

		// Assert
		expect(payload.startTime).toBe("19:15");
		expect(payload.venue).toEqual(venue);
		expect(payload.nextEvent).toEqual(next);
		expect(payload.talks?.["1"]).toMatchObject({
			title: "Public title",
			abstract: "Public abstract",
		});
		expect(payload.agenda[0].title).toBe("Public title");
		expect(JSON.stringify(payload)).not.toContain(catalog.hosts[0].contactName);
	});

	it("exposes only public fields and assigns pictures by current agenda position", async () => {
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
			{
				assetParticipantProjection:
					new JourneyPolicyComposition().assetParticipantProjection(),
				publicAssetUrl: new PublicationDomainComposition().publicAssetUrl(),
				createValidateReferentialCatalog: (...args) =>
					new ReferentialDomainComposition().validateReferentialCatalog(
						...args,
					),
			},
			presenter,
			{ load: vi.fn(async () => source) },
			"19:15",
		);

		// Act
		await projection.create(event, [], false);
		const payload = vi.mocked(presenter.format).mock.calls[0][0];

		// Assert
		expect(payload.pictures).toEqual({
			"1": {
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
			"startTime",
			"talks",
			"timeZone",
			"title",
			"venue",
		]);
		for (const speaker of source.speakers)
			expect(JSON.stringify(payload)).not.toContain(speaker.email);
		for (const host of source.hosts)
			expect(JSON.stringify(payload)).not.toContain(String(host.contactName));
	});

	it("clears portraits when the agenda becomes empty", async () => {
		// Arrange
		const presenter: AssetRenderPresenter = {
			format: vi.fn(() => ({ text: {}, pictures: {} })),
		};
		const projection = new AssetRenderProjection(
			{
				assetParticipantProjection:
					new JourneyPolicyComposition().assetParticipantProjection(),
				publicAssetUrl: new PublicationDomainComposition().publicAssetUrl(),
				createValidateReferentialCatalog: (...args) =>
					new ReferentialDomainComposition().validateReferentialCatalog(
						...args,
					),
			},
			presenter,
			{ load: vi.fn(async () => catalog) },
			"19:15",
		);

		// Act
		await projection.create({ ...event, agenda: [] }, [], true);

		// Assert
		expect(vi.mocked(presenter.format).mock.calls[0][0].pictures).toEqual({});
	});
});
