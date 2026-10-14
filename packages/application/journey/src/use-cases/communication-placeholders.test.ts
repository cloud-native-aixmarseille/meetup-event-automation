import { describe, expect, it } from "vitest";
import { CommunicationPlaceholders } from "./communication-placeholders.js";

const event = {
	date: "2099-06-08",
	publicationLinks: {
		meetup: "https://www.meetup.com/example-group/events/123",
		community: "https://community.example.test/event",
		assets: "https://drive.google.com/drive/folders/event-assets",
	},
};

describe("email event placeholders", () => {
	it("uses the presentation file while preserving the event publication URLs", () => {
		// Arrange
		const slidesUrl =
			"https://docs.google.com/presentation/d/event-slides/edit";

		// Act
		const result = CommunicationPlaceholders.eventPlaceholders(
			event,
			slidesUrl,
		);

		// Assert
		expect(result).toEqual({
			eventDate: event.date,
			eventMeetupUrl: event.publicationLinks.meetup,
			eventCncfUrl: event.publicationLinks.community,
			eventSlidesUrl: slidesUrl,
		});
	});

	it.each([undefined, event.publicationLinks.assets])(
		"never substitutes the event folder when a presentation is unavailable: %s",
		(slidesUrl) => {
			// Arrange
			// Use the event with a valid asset folder.

			// Act
			const result = CommunicationPlaceholders.eventPlaceholders(
				event,
				slidesUrl,
			);

			// Assert
			expect(result).not.toHaveProperty("eventSlidesUrl");
			expect(Object.values(result)).not.toContain(
				event.publicationLinks.assets,
			);
		},
	);
});
