import { ContentFingerprint } from "@meetup-automation/publication";
import { describe, expect, it, vi } from "vitest";
import { ApprovalValueFingerprint } from "../approval/approval-value-fingerprint.js";
import { MeetupSlidesApproval } from "./meetup-slides-approval.js";

describe("attendee slides approval identity", () => {
	it.each(["pdf", "event", "date", "language"])(
		"requires a new revision when %s changes",
		async (changed) => {
			// Arrange
			const approvals = {
				request: vi
					.fn()
					.mockResolvedValue({ status: "pending", notificationFailed: false }),
				synchronize: vi.fn(),
			};
			const fingerprint = new ApprovalValueFingerprint(
				new ContentFingerprint(),
			);
			const clock = { now: () => "2099-06-09T10:00:00Z" };
			const operation = new MeetupSlidesApproval(
				approvals,
				fingerprint,
				clock,
				"fr",
			);
			const revised = new MeetupSlidesApproval(
				approvals,
				fingerprint,
				clock,
				changed === "language" ? "en" : "fr",
			);

			// Act
			await operation.request(
				"2099-06-08",
				"https://www.meetup.com/example/events/123/",
				"https://drive.google.com/file/d/pdf/view",
			);
			await revised.request(
				changed === "date" ? "2099-06-07" : "2099-06-08",
				`https://www.meetup.com/example/events/${changed === "event" ? "456" : "123"}/`,
				`https://drive.google.com/file/d/${changed === "pdf" ? "new-pdf" : "pdf"}/view`,
			);

			// Assert
			const [first, second] = approvals.request.mock.calls.map(
				([request]) => request,
			);
			expect(first.kind).toBe("meetup-slides");
			expect(first.revision).not.toBe(second.revision);
			expect(first.slides).toEqual({
				eventUrl: "https://www.meetup.com/example/events/123/",
				pdfUrl: "https://drive.google.com/file/d/pdf/view",
				language: "fr",
			});
		},
	);
});
