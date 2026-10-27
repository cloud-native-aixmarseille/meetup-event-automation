import { PublicAssetUrl } from "@meetup-automation/publication";
import { describe, expect, it } from "vitest";
import { socialPublicationRequest } from "../testing/social-publication.fixtures.js";
import { ContentValueSchema } from "./content-value-schema.js";
import { SocialPublicationApprovalSchema } from "./social-publication-approval-schema.js";

describe("social publication approval external schema", () => {
	it.each([
		{
			...socialPublicationRequest.social,
			expiresAt: socialPublicationRequest.social.plannedAt,
		},
		{ ...socialPublicationRequest.social, text: "" },
		{ ...socialPublicationRequest.social, token: "private-token" },
		{ ...socialPublicationRequest.social, destinationIdentity: "T123\nC123" },
		{
			...socialPublicationRequest.social,
			recovery: { outcome: "not-published", reference: "" },
		},
		{
			...socialPublicationRequest.social,
			recovery: { outcome: "unknown", reference: "Provider read" },
		},
	])("rejects invalid public delivery details %#", (value) => {
		// Arrange
		const schema = new SocialPublicationApprovalSchema(
			new ContentValueSchema(new PublicAssetUrl()),
		);

		// Act
		const validate = () => schema.validate(value);

		// Assert
		expect(validate).toThrow();
	});
});
