import type { ScheduledEvent } from "@meetup-automation/publication";
import { describe, expect, it } from "vitest";
import {
	publicationFixture,
	publicationUrl,
} from "../../testing/meetup-publication.fixtures.js";
import { JourneyPolicyComposition } from "../policy-composition.js";
import { MeetupPublicationApproval } from "./meetup-publication-approval.js";

describe("Meetup publication approval revision", () => {
	it.each([
		{ title: "Changed title" },
		{ description: "Changed agenda" },
		{ date: "2026-10-03" },
		{ startTime: "19:00" },
		{ endTime: "21:00" },
		{ timeZone: "UTC" },
		{ venue: { name: "Changed venue", city: "Other City" } },
	] satisfies Partial<ScheduledEvent>[])(
		"requires a distinct approval for changed content: %j",
		async (change) => {
			// Arrange
			const f = publicationFixture();
			const event = new JourneyPolicyComposition()
				.meetupPublicationProjection()
				.create(f.currentEvent, f.dependencies.settings);
			if (!event) throw new Error("Expected event fixture");
			const approval = new MeetupPublicationApproval(
				{
					meetupPublicationRevision:
						new JourneyPolicyComposition().meetupPublicationRevision(),
				},
				f.approval,
				f.dependencies.clock,
			);

			// Act
			await approval.request(event, publicationUrl);
			await approval.request({ ...event, ...change }, publicationUrl);

			// Assert
			expect(f.approval.request.mock.calls[0]?.[0].revision).not.toBe(
				f.approval.request.mock.calls[1]?.[0].revision,
			);
		},
	);
	it("binds approval to the remote draft identity", async () => {
		// Arrange
		const f = publicationFixture();
		const event = new JourneyPolicyComposition()
			.meetupPublicationProjection()
			.create(f.currentEvent, f.dependencies.settings);
		if (!event) throw new Error("Expected event fixture");
		const approval = new MeetupPublicationApproval(
			{
				meetupPublicationRevision:
					new JourneyPolicyComposition().meetupPublicationRevision(),
			},
			f.approval,
			f.dependencies.clock,
		);

		// Act
		await approval.request(event, publicationUrl);
		await approval.request(event, publicationUrl.replace("12345", "67890"));

		// Assert
		expect(f.approval.request.mock.calls[0]?.[0].revision).not.toBe(
			f.approval.request.mock.calls[1]?.[0].revision,
		);
	});
});
