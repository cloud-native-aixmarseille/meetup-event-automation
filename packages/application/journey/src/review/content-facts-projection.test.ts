import { describe, expect, it, vi } from "vitest";
import { event } from "../../testing/meetup-journey.fixtures.js";
import type { ContentTarget } from "../proposals/promotional-content.js";
import { ContentFactsProjection } from "./content-facts-projection.js";

describe("public content facts", () => {
	it.each(["en", "fr"] as const)(
		"derives the cover month from the event date in %s",
		(language) => {
			// Arrange
			const formatMonth = vi.fn(() =>
				language === "fr" ? "novembre" : "November",
			);
			const projection = new ContentFactsProjection(formatMonth);
			const source = { ...event, date: "2026-11-05" };
			// Act
			const facts = projection.create(
				source,
				{ startTime: "18:45", endTime: "22:00", venues: {} },
				{ months: {}, mentions: [], reminderTime: "09:00", guidance: "" },
				null,
				"cover",
				language,
			);
			// Assert
			expect(formatMonth).toHaveBeenCalledExactlyOnceWith(
				"2026-11-05",
				language,
			);
			expect(facts.month).toBe(language === "fr" ? "novembre" : "November");
		},
	);
	it("keeps an explicit month label without invoking automatic formatting", () => {
		// Arrange
		const formatMonth = vi.fn();
		const projection = new ContentFactsProjection(formatMonth);
		// Act
		const facts = projection.create(
			event,
			{ startTime: "18:45", endTime: "22:00", venues: {} },
			{
				months: { [event.date.slice(0, 7)]: "NOVEMBRE" },
				mentions: [],
				reminderTime: "09:00",
				guidance: "",
			},
			null,
			"cover",
			"fr",
		);
		// Assert
		expect(facts.month).toBe("NOVEMBRE");
		expect(formatMonth).not.toHaveBeenCalled();
	});
	it("does not change complete talk artwork facts when event copy is approved", () => {
		// Arrange
		const projection = new ContentFactsProjection(() => "novembre");
		const source = {
			...event,
			agenda: [
				{
					...event.agenda[0],
					proposal: {
						provider: "conference-hall",
						event: "example-event",
						languages: ["fr"],
						formats: ["talk"],
						id: "21",
						title: "Observable clusters",
						abstract: "Tracing workloads with OpenTelemetry.",
					},
				},
			],
		};
		const publication = { startTime: "18:45", endTime: "22:00", venues: {} };
		const settings = {
			months: {},
			mentions: [],
			reminderTime: "09:00",
			guidance: "",
		};
		// Act
		const before = projection.create(
			{ ...source, description: "" },
			publication,
			settings,
			null,
			"cover",
			"fr",
		);
		const after = projection.create(
			{ ...source, description: "Approved event description" },
			publication,
			settings,
			null,
			"cover",
			"fr",
		);
		// Assert
		expect(after).toEqual(before);
		expect(after.eventDescription).toBeUndefined();
	});
	it.each<ContentTarget>([
		"cover",
		"title",
		"description",
		"slack-engineering:announcement",
	])(
		"projects manual talk subjects and scopes description context for %s",
		(target) => {
			// Arrange
			const projection = new ContentFactsProjection(() => "novembre");
			const source = {
				...event,
				description:
					"OpenTelemetry tracing, then an incident response exercise.",
				agenda: [
					{
						...event.agenda[0],
						description: "Observability in practice",
						proposal: undefined,
					},
				],
			};

			// Act
			const facts = projection.create(
				source,
				{ startTime: "18:45", endTime: "22:00", venues: {} },
				{
					months: { [source.date.slice(0, 7)]: "Février" },
					mentions: [],
					reminderTime: "09:00",
					guidance: "",
				},
				null,
				target,
				"fr",
			);

			// Assert
			expect(facts.month).toBe("Février");
			expect(facts.talks).toMatchObject([
				{ title: "Observability in practice", abstract: "" },
			]);
			expect(facts.eventDescription).toBe(
				target === "cover" ? source.description : undefined,
			);
		},
	);
	it("does not restore unverified agenda subjects from the event description", () => {
		// Arrange
		const projection = new ContentFactsProjection(() => "novembre");
		const source = {
			...event,
			description: "Unverified talk details",
			agenda: [],
		};

		// Act
		const facts = projection.create(
			source,
			{ startTime: "18:45", endTime: "22:00", venues: {} },
			{ months: {}, mentions: [], reminderTime: "09:00", guidance: "" },
			null,
			"cover",
			"fr",
		);

		// Assert
		expect(facts.eventDescription).toBeUndefined();
		expect(facts.talks).toEqual([]);
	});
});
