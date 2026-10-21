import type { MeetupPublicationApprovalDetails } from "@meetup-automation/journey";

export class MeetupApprovalDetails {
	static validate(value: MeetupPublicationApprovalDetails): void {
		if (
			!value ||
			!MeetupApprovalDetails.text(value.url, 2048) ||
			!/^https:\/\/www\.meetup\.com\/[a-z0-9-]+\/events\/[1-9]\d*\/$/.test(
				value.url,
			) ||
			!MeetupApprovalDetails.text(value.title, 80) ||
			!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.startTime) ||
			!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.endTime) ||
			!MeetupApprovalDetails.text(value.timeZone, 100) ||
			!MeetupApprovalDetails.text(value.venue?.name, 500) ||
			!MeetupApprovalDetails.text(value.venue?.city, 500)
		)
			throw new Error("Invalid Meetup approval details");
	}
	private static text(value: string, maximum: number): boolean {
		return (
			typeof value === "string" &&
			value.trim().length > 0 &&
			value.length <= maximum &&
			!/[\r\n]/.test(value)
		);
	}
}
