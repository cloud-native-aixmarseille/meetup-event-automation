import { describe, expect, it } from "vitest";
import { SlackNotificationGatewayComposition } from "./dependency-composition.js";
import { SlackSocialPublicationApprovalPresenter } from "./slack-social-publication-approval-presenter.js";

describe("organizer social publication notification", () => {
	it.each(["en", "fr"])(
		"links the separate publication review without rendering Slack mentions in %s",
		(locale) => {
			// Arrange
			const presenter = new SlackSocialPublicationApprovalPresenter(
				new SlackNotificationGatewayComposition().slackApprovalMessages(locale),
			);
			const request = {
				kind: "social-publication" as const,
				target: "announcement <!channel>",
				eventDate: "2099-06-08",
				destination: "C123",
				approvalUrl:
					"https://github.com/example/events/issues/1#issuecomment-10",
			};

			// Act
			const text = presenter.render(request);

			// Assert
			expect(text).toContain(request.approvalUrl);
			expect(text).toContain("announcement &lt;!channel&gt;");
			expect(text).not.toContain("<!channel>");
		},
	);
});
