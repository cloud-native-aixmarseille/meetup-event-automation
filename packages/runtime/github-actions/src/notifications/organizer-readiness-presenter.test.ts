import type { OrganizerReadinessContext } from "@meetup-automation/journey";
import { describe, expect, it } from "vitest";
import { OrganizerNotificationMessages } from "./organizer-notification-messages.js";
import { OrganizerReadinessPresenter } from "./organizer-readiness-presenter.js";

const context: OrganizerReadinessContext = {
	repository: "example/meetups",
	issueNumber: 42,
	eventDate: "2026-09-04",
	reasons: [
		{ code: "event.logistics.intent.invalid", field: "Aperitif" },
		{ code: "event.logistics.intent.invalid", field: "Restaurant / Bar" },
		{
			code: "publication.meetup-url.invalid",
			field: "publicationLinks.meetup",
		},
	],
};

describe("OrganizerReadinessPresenter", () => {
	it.each([
		[
			"en",
			"Set Aperitif to Yes or No.",
			"Set Restaurant / Bar to Yes or No.",
			"Please resolve:",
		],
		[
			"fr",
			"Renseignez Aperitif avec Yes ou No.",
			"Renseignez Restaurant / Bar avec Yes ou No.",
			"Points à résoudre :",
		],
	])(
		"explains the required fixes and links to the issue in %s",
		(locale, aperitif, restaurant, heading) => {
			// Arrange
			const presenter = new OrganizerReadinessPresenter(
				new OrganizerNotificationMessages(locale),
			);

			// Act
			const text = presenter.render(context);

			// Assert
			expect(text).toContain("#42");
			expect(text).toContain("2026-09-04");
			expect(text).toContain(heading);
			expect(text).toContain(aperitif);
			expect(text).toContain(restaurant);
			expect(text).toContain("Meetup Link");
			expect(text).toContain("/fr-fr/");
			expect(text).toContain("https://github.com/example/meetups/issues/42");
		},
	);

	it("deduplicates reasons while preserving different required actions", () => {
		// Arrange
		const presenter = new OrganizerReadinessPresenter(
			new OrganizerNotificationMessages(),
		);
		const reasons = [
			{ code: "event.confirmation.host.missing" },
			{ code: "event.confirmation.host.missing" },
			{ code: "event.confirmation.speakers.missing" },
		];

		// Act
		const text = presenter.render({ ...context, reasons });

		// Assert
		expect(text.match(/hoster:confirmed/g)).toHaveLength(1);
		expect(text).toContain("speakers:confirmed");
	});

	it("redacts unknown diagnostic values and invalid date text", () => {
		// Arrange
		const presenter = new OrganizerReadinessPresenter(
			new OrganizerNotificationMessages(),
		);
		const privateValue = "private@example.invalid <!channel>";
		const reasons = [{ code: privateValue, field: privateValue }];

		// Act
		const text = presenter.render({
			...context,
			eventDate: privateValue,
			reasons,
		});

		// Assert
		expect(text).not.toContain(privateValue);
		expect(text).not.toContain("<!channel>");
		expect(text).toContain("date to confirm");
		expect(text).toContain("Review the remaining validation items");
	});

	it("provides issue guidance when no specific reason is available", () => {
		// Arrange
		const presenter = new OrganizerReadinessPresenter(
			new OrganizerNotificationMessages(),
		);

		// Act
		const text = presenter.render({ ...context, reasons: [] });

		// Assert
		expect(text).toContain("Review the remaining validation items");
		expect(text).toContain("https://github.com/example/meetups/issues/42");
	});
});
