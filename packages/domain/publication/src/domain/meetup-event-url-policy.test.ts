import { describe, expect, it } from "vitest";
import { PublicationDomainComposition } from "../dependency-composition.js";
import { MeetupEventUrlPolicy } from "./meetup-event-url-policy.js";

describe("Meetup publication link evaluation", () => {
	it.each([
		"https://www.meetup.com/example-group/events/0/",
		"https://www.meetup.com/example-group/events/0123/",
		"https://www.meetup.com/other-group/events/123/",
		"https://www.meetup.com/example-group/events/123//",
		"https://www.meetup.com/example-group/events/123/?token=private",
	])("reports invalid identities without proposing a patch: %s", (url) => {
		// Arrange
		const policy = new MeetupEventUrlPolicy(
			{
				publicationLinkEvaluation:
					new PublicationDomainComposition().publicationLinkEvaluation(),
			},
			"https://www.meetup.com/example-group/events/",
		);

		// Act
		const result = policy.evaluate({ meetup: url });

		// Assert
		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({ code: "publication.meetup-url.invalid" }),
		);
		expect(result.patch.operations).toEqual([]);
	});

	it("rejects a link when its configured prefix is not a Meetup group", () => {
		// Arrange
		const prefix = "https://untrusted.example/example-group/events/";
		const policy = new MeetupEventUrlPolicy(
			{
				publicationLinkEvaluation:
					new PublicationDomainComposition().publicationLinkEvaluation(),
			},
			prefix,
		);

		// Act
		const result = policy.evaluate({ meetup: `${prefix}123/` });

		// Assert
		expect(result.diagnostics[0]?.code).toBe("publication.meetup-url.invalid");
	});
});
