import {
	MeetupEventUrl,
	type PresentationFileUrl,
} from "@meetup-automation/publication";
import type { ApprovalSchema } from "./approval-schema.js";

/** Validate the external public facts used to review attendee delivery. */
export class MeetupSlidesApprovalSchema {
	constructor(
		private readonly schema: Pick<ApprovalSchema, "object">,
		private readonly urls: Pick<PresentationFileUrl, "normalize">,
	) {}
	validate(value: Record<string, unknown>): void {
		const slides = value.slides;
		if (
			value.publication !== undefined ||
			value.content !== undefined ||
			value.social !== undefined ||
			value.details !== undefined ||
			value.recipientCount !== undefined ||
			!this.schema.object(slides) ||
			typeof slides.eventUrl !== "string" ||
			MeetupEventUrl.parse(slides.eventUrl)?.value !== slides.eventUrl ||
			typeof slides.pdfUrl !== "string" ||
			!slides.pdfUrl.startsWith("https://drive.google.com/file/d/") ||
			this.urls.normalize(slides.pdfUrl) !== slides.pdfUrl ||
			(slides.language !== "fr" && slides.language !== "en")
		)
			throw new Error("Invalid Meetup slides approval details");
	}
}
