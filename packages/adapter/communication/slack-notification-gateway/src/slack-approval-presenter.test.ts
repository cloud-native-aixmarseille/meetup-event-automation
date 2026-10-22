import type { ApprovalNotificationRequest } from "@meetup-automation/journey";
import { describe, expect, it } from "vitest";
import { SlackNotificationGatewayComposition } from "./dependency-composition.js";
import { SlackApprovalPresenter } from "./slack-approval-presenter.js";
import { SlackEmailApprovalPresenter } from "./slack-email-approval-presenter.js";
import { SlackMeetupApprovalPresenter } from "./slack-meetup-approval-presenter.js";

const facts = {
	destination: "C12345",
	eventDate: "2099-06-08",
	approvalUrl: "https://github.com/example/meetups/issues/42#issuecomment-100",
};

describe("Slack approval presentation", () => {
	it.each([
		["en", "Introduction emails", "Meetup publication"],
		["fr", "E-mails d'introduction", "Publication Meetup"],
	])(
		"renders public approval facts in %s",
		(locale, emailHeading, meetupHeading) => {
			// Arrange
			const presenter = new SlackApprovalPresenter({
				"email-introduction": new SlackEmailApprovalPresenter(
					new SlackNotificationGatewayComposition().slackApprovalMessages(
						locale,
					),
				),
				"meetup-publication": new SlackMeetupApprovalPresenter(
					new SlackNotificationGatewayComposition().slackApprovalMessages(
						locale,
					),
				),
			});
			const requests: readonly ApprovalNotificationRequest[] = [
				{ ...facts, kind: "email-introduction", recipientCount: 2 },
				{ ...facts, kind: "meetup-publication" },
			];

			// Act
			const [email, meetup] = requests.map((request) =>
				presenter.render(request),
			);

			// Assert
			expect(email).toContain(emailHeading);
			expect(email).toContain("2");
			expect(meetup).toContain(meetupHeading);
			for (const body of [email, meetup]) {
				expect(body).toContain(facts.eventDate);
				expect(body).toContain(facts.approvalUrl);
				expect(body).not.toContain("<!--");
			}
		},
	);
});
