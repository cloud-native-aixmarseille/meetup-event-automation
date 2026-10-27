import { describe, expect, it } from "vitest";
import { identity } from "../../testing/meetup-journey.fixtures.js";
import { socialFixture } from "../../testing/social-publication.fixtures.js";
import { SocialPublicationApprovalRequest } from "./social-publication-approval-request.js";
import { SocialPublicationIntents } from "./social-publication-intents.js";

describe("publication approval preview", () => {
	it.each([
		["announcement", "after-approval", "2026-10-28T17:45:00.000Z"],
		["d7", "2026-10-21T07:00:00.000Z", "2026-10-21T22:00:00.000Z"],
		["d0", "2026-10-28T08:00:00.000Z", "2026-10-28T17:45:00.000Z"],
	] as const)(
		"binds the exact %s destination and real expiry",
		async (purpose, plannedAt, expiresAt) => {
			// Arrange
			const f = await socialFixture(`slack-engineering:${purpose}`);
			const requests = new SocialPublicationApprovalRequest(
				f.dependencies.timing,
				f.fingerprints,
			);
			const record = await new SocialPublicationIntents(f.dependencies).anchor(
				identity,
				f.proposal,
			);

			// Act
			const request = requests.request(f.proposal, record);

			// Assert
			expect(request.social).toMatchObject({
				plannedAt,
				expiresAt,
				text: f.draft.text,
				destinationIdentity: "TEXAMPLE/CEXAMPLE",
			});
		},
	);
});
