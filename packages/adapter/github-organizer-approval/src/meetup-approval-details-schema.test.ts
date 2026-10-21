import { PublicationDomainComposition } from "@meetup-automation/publication";
import { describe, expect, it } from "vitest";
import { publicationRequest } from "../testing/approval.fixtures.js";
import { GithubOrganizerApprovalComposition } from "./dependency-composition.js";
import { MeetupApprovalDetailsSchema } from "./meetup-approval-details-schema.js";

describe("publication approval facts", () => {
	it("accepts the public draft summary", () => {
		// Arrange
		const value = publicationRequest.publication;

		// Act
		const result = new MeetupApprovalDetailsSchema({
			approvalSchema: new GithubOrganizerApprovalComposition().approvalSchema(),
			scheduledEventPolicy:
				new PublicationDomainComposition().scheduledEventPolicy(),
		}).validate(value);

		// Assert
		expect(result).toBeUndefined();
	});
	it.each([
		{ url: "javascript:alert(1)" },
		{ url: "https://www.meetup.com/example/events/123/?token=private" },
		{ url: publicationRequest.publication.url.slice(0, -1) },
		{ url: "https://www.meetup.com/example/events/0123/" },
		{ title: "" },
		{ title: "x".repeat(81) },
		{ startTime: "18:30\nscript" },
		{ endTime: "unknown" },
		{ startTime: "24:00" },
		{ url: `${publicationRequest.publication.url}\n` },
		{ timeZone: "UTC\n- [x] Approve" },
		{ venue: { name: "", city: "Marseille" } },
	])("rejects invalid or injectable approval facts: %j", (override) => {
		// Arrange
		const value = { ...publicationRequest.publication, ...override };
		const schema: MeetupApprovalDetailsSchema = new MeetupApprovalDetailsSchema(
			{
				approvalSchema:
					new GithubOrganizerApprovalComposition().approvalSchema(),
				scheduledEventPolicy:
					new PublicationDomainComposition().scheduledEventPolicy(),
			},
		);
		let error: unknown;

		// Act
		try {
			schema.validate(value);
		} catch (caught) {
			error = caught;
		}

		// Assert
		expect(error).toBeInstanceOf(Error);
	});
});
