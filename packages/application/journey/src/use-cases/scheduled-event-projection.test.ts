import { expect, it } from "vitest";
import { event } from "../../testing/meetup-journey.fixtures.js";
import { ScheduledEventProjection } from "./scheduled-event-projection.js";

it("preserves reviewed multiline copy without appending agenda details", () => {
	// Arrange
	const description =
		"Thursday evening, 18:45 at Example Venue.\n\nA practical talk with our community.\n\nJoin the discussion!";
	const source = { ...event, description };
	const settings = {
		startTime: "18:45",
		endTime: "22:00",
		venues: { "host-0001": { name: "Example Venue", city: "Example City" } },
	};
	const projection = new ScheduledEventProjection();

	// Act
	const result = projection.create(source, settings);

	// Assert
	expect(result?.description).toBe(description);
});
