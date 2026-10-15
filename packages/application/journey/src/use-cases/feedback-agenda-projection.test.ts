import { describe, expect, it } from "vitest";
import { event } from "../../testing/meetup-journey.fixtures.js";
import { FeedbackAgendaProjection } from "./feedback-agenda-projection.js";

describe("public feedback agenda", () => {
	it("projects only talk titles and public speaker identities", () => {
		// Arrange
		const source = {
			...event,
			agenda: [
				{
					description: "  Reliable platforms  ",
					speakers: [
						{
							id: "speaker-0001",
							displayName: "Alex Example",
							source: { path: "private/catalog.csv", line: 7 },
							email: "private@example.test",
						},
					],
				},
			],
		};

		// Act
		const agenda = FeedbackAgendaProjection.create(source, []);

		// Assert
		expect(agenda).toEqual({
			talks: [
				{
					title: "Reliable platforms",
					speakers: [{ id: "speaker-0001", name: "Alex Example" }],
				},
			],
		});
	});

	it.each([
		{ agenda: [] },
		{ agenda: [{ description: " ", speakers: event.agenda[0].speakers }] },
		{ agenda: [{ description: "Platforms", speakers: [] }] },
		{
			agenda: [
				{
					description: "Platforms",
					speakers: [{ displayName: "Alex Example" }],
				},
			],
		},
		{
			agenda: [
				{
					description: "Platforms",
					speakers: [{ id: "speaker-0001", displayName: " " }],
				},
			],
		},
	])(
		"waits for complete talk subjects and resolved speakers: %j",
		({ agenda }) => {
			// Arrange
			const source = { ...event, agenda };

			// Act
			const result = FeedbackAgendaProjection.create(source, []);

			// Assert
			expect(result).toBeUndefined();
		},
	);

	it.each([
		"referential.reference.speaker.unknown",
		"referential.speaker.id.duplicate",
		"referential.host.email.invalid",
		"event.agenda.description.missing",
	])("does not publish unvalidated catalog or agenda data: %s", (code) => {
		// Arrange
		const diagnostics = [
			{ code, severity: "error" as const, message: "Invalid input" },
		];

		// Act
		const result = FeedbackAgendaProjection.create(event, diagnostics);

		// Assert
		expect(result).toBeUndefined();
	});

	it("does not require unrelated publication links or host confirmation", () => {
		// Arrange
		const source = {
			...event,
			confirmations: { host: false, speakers: false },
		};
		const diagnostics = [
			{
				code: "publication.meetup.missing",
				severity: "error" as const,
				message: "Missing link",
			},
		];

		// Act
		const result = FeedbackAgendaProjection.create(source, diagnostics);

		// Assert
		expect(result?.talks).toHaveLength(1);
	});
});
