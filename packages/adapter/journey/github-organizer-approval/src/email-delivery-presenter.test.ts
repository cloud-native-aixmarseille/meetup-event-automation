import { describe, expect, it } from "vitest";
import { GithubOrganizerApprovalComposition } from "./dependency-composition.js";
import { EmailDeliveryPresenter } from "./email-delivery-presenter.js";

describe("email delivery summaries", () => {
	it.each(["en", "fr"])(
		"distinguishes accepted requests from receipt in %s",
		(locale) => {
			// Arrange
			const presenter = new EmailDeliveryPresenter(
				new GithubOrganizerApprovalComposition().approvalMessages(locale),
			);
			// Act
			const body = presenter.render([
				{ kind: "host-introduction", status: "accepted", count: 1 },
			]);
			// Assert
			expect(body).toContain(
				locale === "fr" ? "✅ Envoi accepté (1)" : "✅ Send accepted (1)",
			);
			expect(body).toContain(
				locale === "fr"
					? "pas que l'email a été reçu"
					: "not that the email reached the inbox",
			);
		},
	);
});
