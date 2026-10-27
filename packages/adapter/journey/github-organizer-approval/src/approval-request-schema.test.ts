import { describe, expect, it } from "vitest";
import {
	request,
	publicationRequest,
	communityRequest,
} from "../testing/approval.fixtures.js";
import { contentRequest } from "../testing/content.fixtures.js";
import { socialPublicationRequest } from "../testing/social-publication.fixtures.js";
import { ApprovalRequestSchema } from "./approval-request-schema.js";
import { GithubOrganizerApprovalComposition } from "./dependency-composition.js";

describe("approval request kinds", () => {
	it.each([request, publicationRequest, communityRequest, contentRequest])(
		"rejects social publication facts on $kind approvals",
		(input) => {
			// Arrange
			const schema =
				new GithubOrganizerApprovalComposition().approvalRequestSchema();
			const value = { ...input, social: socialPublicationRequest.social };

			// Act
			const validate = () => schema.validate(value);

			// Assert
			expect(schema).toBeInstanceOf(ApprovalRequestSchema);
			expect(validate).toThrow("Invalid social publication approval kind");
		},
	);
});
