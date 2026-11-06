import { PresentationFileUrl } from "@meetup-automation/publication";
import { describe, expect, it } from "vitest";
import { slidesRequest } from "../testing/approval.fixtures.js";
import { ApprovalSchema } from "./approval-schema.js";
import { MeetupSlidesApprovalSchema } from "./meetup-slides-approval-schema.js";

describe("external attendee slides approval facts", () => {
	it.each([
		{ slides: undefined },
		{
			slides: {
				...slidesRequest.slides,
				eventUrl: "https://untrusted.test/events/123/",
			},
		},
		{
			slides: {
				...slidesRequest.slides,
				pdfUrl: "https://drive.google.com/drive/folders/private",
			},
		},
		{ slides: { ...slidesRequest.slides, language: "unknown" } },
		{ recipientCount: 1 },
		{ content: {} },
	])("rejects contradictory or invalid review data: %j", (change) => {
		// Arrange
		const schema = new MeetupSlidesApprovalSchema(
			new ApprovalSchema(),
			new PresentationFileUrl(),
		);

		// Act
		const validate = () => schema.validate({ ...slidesRequest, ...change });

		// Assert
		expect(validate).toThrow("Invalid Meetup slides approval details");
	});
});
