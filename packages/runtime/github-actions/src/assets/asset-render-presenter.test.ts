import { describe, expect, it } from "vitest";
import { AssetMessages } from "./asset-messages.js";
import { AssetRenderPresenterImpl } from "./asset-render-presenter.js";

describe("asset public presentation", () => {
	it("formats venue, participant, and next-event fields from their public projections", () => {
		// Arrange
		const presenter = new AssetRenderPresenterImpl(new AssetMessages("fr"));
		const hostLogo = {
			hostId: "host-0001",
			url: "https://images.example.org/logo.png",
			description: "Logo de l'hôte",
		};

		// Act
		const result = presenter.format({
			date: "2026-10-15",
			timeZone: "Europe/Paris",
			agenda: [],
			pictures: {},
			hostLogo,
			venue: {
				address: "1 Public Square",
				postalCode: "13001",
				city: "Marseille",
			},
			talks: {
				opening: {
					title: "Public title",
					abstract: "Public abstract",
					speakers: ["Alice", "Bob"],
				},
			},
			speakers: { portrait: "Alice" },
			nextEvent: { date: "2026-11-12", hostName: "Next host", city: "Aix" },
		});

		// Assert
		expect(result.hostLogo).toEqual(hostLogo);
		expect(result.text).toMatchObject({
			"event.date.month": "octobre",
			"event.date.numeric": "15/10/2026",
			"event.date.weekday": "jeudi 15 octobre 2026",
			"host.address": "1 Public Square",
			"host.postal_code": "13001",
			"host.city": "Marseille",
			"talk.title:opening": "Public title",
			"talk.abstract:opening": "Public abstract",
			"talk.speakers:opening": "Alice et Bob",
			"speaker.name:portrait": "Alice",
			"next_event.date": "12 novembre 2026",
			"next_event.date.numeric": "12/11/2026",
			"next_event.host.name": "Next host",
			"next_event.host.city": "Aix",
		});
	});

	it.each([
		["en", "October 15, 2026", "Example and Other"],
		["fr", "15 octobre 2026", "Example et Other"],
	])("formats dates and co-speakers for %s", (locale, date, speakers) => {
		// Arrange
		const presenter = new AssetRenderPresenterImpl(new AssetMessages(locale));
		// Act
		const result = presenter.format({
			title: "Public title",
			date: "2026-10-15",
			timeZone: "Pacific/Kiritimati",
			hostName: "Public host",
			agenda: [{ title: "Talk", speakers: ["Example", "Other"] }],
			pictures: {},
		});
		// Assert
		expect(result.text["event.date"]).toBe(date);
		expect(result.text.agenda).toBe(`Talk - ${speakers}`);
	});
});
