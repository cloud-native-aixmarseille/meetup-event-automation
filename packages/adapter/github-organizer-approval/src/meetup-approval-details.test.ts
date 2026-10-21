import { describe, expect, it } from "vitest";
import { publicationRequest } from "../testing/approval.fixtures.js";
import { MeetupApprovalDetails } from "./meetup-approval-details.js";

describe("publication approval facts", () => {
	it("accepts the public draft summary", () => {
		// Arrange
		const value = publicationRequest.publication;

		// Act
		const result = MeetupApprovalDetails.validate(value);

		// Assert
		expect(result).toBeUndefined();
	});
	it.each([
		{ url: "javascript:alert(1)" },
		{ url: "https://www.meetup.com/example/events/123/?token=private" },
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
		let error: unknown;

		// Act
		try {
			MeetupApprovalDetails.validate(value);
		} catch (caught) {
			error = caught;
		}

		// Assert
		expect(error).toBeInstanceOf(Error);
	});
});
