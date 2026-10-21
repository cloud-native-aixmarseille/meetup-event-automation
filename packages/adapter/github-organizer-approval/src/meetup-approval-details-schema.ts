import type { MeetupPublicationApprovalDetails } from "@meetup-automation/journey";
import {
	MeetupEventUrl,
	ScheduledEventPolicy,
} from "@meetup-automation/publication";
import { ApprovalSchema } from "./approval-schema.js";

export class MeetupApprovalDetailsSchema {
	static validate(
		value: unknown,
	): asserts value is MeetupPublicationApprovalDetails {
		if (
			!ApprovalSchema.object(value) ||
			!MeetupApprovalDetailsSchema.text(value.url, 2048) ||
			MeetupEventUrl.parse(value.url)?.value !== value.url ||
			!MeetupApprovalDetailsSchema.text(value.title, 80) ||
			typeof value.startTime !== "string" ||
			!ScheduledEventPolicy.validTime(value.startTime) ||
			typeof value.endTime !== "string" ||
			!ScheduledEventPolicy.validTime(value.endTime) ||
			!MeetupApprovalDetailsSchema.text(value.timeZone, 100) ||
			!ApprovalSchema.object(value.venue) ||
			!MeetupApprovalDetailsSchema.text(value.venue.name, 500) ||
			!MeetupApprovalDetailsSchema.text(value.venue.city, 500)
		)
			throw new Error("Invalid Meetup approval details");
	}
	private static text(value: unknown, maximum: number): value is string {
		return ApprovalSchema.text(value, maximum) && value.trim().length > 0;
	}
}
