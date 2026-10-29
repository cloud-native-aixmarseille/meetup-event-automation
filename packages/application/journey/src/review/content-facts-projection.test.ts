import { describe, expect, it } from "vitest";
import { event } from "../../testing/meetup-journey.fixtures.js";
import type { ContentTarget } from "../proposals/promotional-content.js";
import { ContentFactsProjection } from "./content-facts-projection.js";

describe("public content facts", () => {
	it.each<ContentTarget>([
		"cover",
		"title",
		"description",
		"slack-engineering:announcement",
	])(
		"projects manual talk subjects and scopes description context for %s",
		(target) => {
			// Arrange
			const projection = new ContentFactsProjection();
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
		const projection = new ContentFactsProjection();
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
		);

		// Assert
		expect(facts.eventDescription).toBeUndefined();
		expect(facts.talks).toEqual([]);
	});
});
