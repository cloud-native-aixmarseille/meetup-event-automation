import {
	PublicationDomainComposition,
	type ScheduledEvent,
} from "@meetup-automation/publication";
import { describe, expect, it } from "vitest";
import { MeetupPublicationRevision } from "./meetup-publication-revision.js";

const event: ScheduledEvent = {
	title: "Cloud Native Evening",
	description: "Public agenda",
	date: "2099-06-08",
	startTime: "18:30",
	endTime: "20:30",
	timeZone: "Europe/Paris",
	venue: { name: "Example Venue", city: "Marseille" },
};
const url = "https://www.meetup.com/example/events/123/";

describe("reviewed publication revision", () => {
	it("preserves the serialized public event contract", () => {
		// Arrange
		const expected = new PublicationDomainComposition()
			.contentFingerprint()
			.of(
				'{"url":"https://www.meetup.com/example/events/123/","event":{"title":"Cloud Native Evening","description":"Public agenda","date":"2099-06-08","startTime":"18:30","endTime":"20:30","timeZone":"Europe/Paris","venue":{"name":"Example Venue","city":"Marseille"}}}',
			);

		// Act
		const revision = new MeetupPublicationRevision({
			contentFingerprint:
				new PublicationDomainComposition().contentFingerprint(),
		}).of(event, url);

		// Assert
		expect(revision).toBe(expected);
	});

	it("ignores caller property order and unrelated extra properties", () => {
		// Arrange
		const reordered = {
			venue: {
				city: event.venue.city,
				name: event.venue.name,
				ignored: "extra",
			},
			timeZone: event.timeZone,
			endTime: event.endTime,
			startTime: event.startTime,
			date: event.date,
			description: event.description,
			title: event.title,
			ignored: "extra",
		};

		// Act
		const original = new MeetupPublicationRevision({
			contentFingerprint:
				new PublicationDomainComposition().contentFingerprint(),
		}).of(event, url);
		const same = new MeetupPublicationRevision({
			contentFingerprint:
				new PublicationDomainComposition().contentFingerprint(),
		}).of(reordered, url);

		// Assert
		expect(same).toBe(original);
	});
});
