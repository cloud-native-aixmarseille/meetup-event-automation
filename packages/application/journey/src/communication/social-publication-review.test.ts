import { MeetupPublicationChecklist } from "@meetup-automation/event";
import { describe, expect, it } from "vitest";
import { identity } from "../../testing/meetup-journey.fixtures.js";
import { socialFixture } from "../../testing/social-publication.fixtures.js";
import { SocialPublicationApprovalRequest } from "./social-publication-approval-request.js";
import { SocialPublicationIntents } from "./social-publication-intents.js";
import { SocialPublicationReview } from "./social-publication-review.js";

describe("last-moment social authority", () => {
	it("blocks a write when an approval read crosses event start", async () => {
		// Arrange
		const f = await socialFixture();
		const review = new SocialPublicationReview(
			f.dependencies,
			new SocialPublicationApprovalRequest(
				f.dependencies.timing,
				f.fingerprints,
			),
			new MeetupPublicationChecklist(),
		);
		const record = await new SocialPublicationIntents(f.dependencies).anchor(
			identity,
			f.proposal,
		);
		f.state.now = "2026-10-28T17:44:59Z";
		f.dependencies.approvals.request.mockImplementation(async () => {
			f.state.now = "2026-10-28T17:45:00Z";
			return {
				status: "approved",
				actor: "organizer",
				decidedAt: "2026-10-20T10:00:00Z",
				notificationFailed: false,
			};
		});

		// Act
		const result = review.requireCurrent(identity, f.proposal, record);

		// Assert
		await expect(result).rejects.toThrow("changed");
	});
	it.each(["missing-provenance", "revoked-publisher"])(
		"blocks %s even with reviewed content",
		async (scenario) => {
			// Arrange
			const f = await socialFixture();
			const review = new SocialPublicationReview(
				f.dependencies,
				new SocialPublicationApprovalRequest(
					f.dependencies.timing,
					f.fingerprints,
				),
				new MeetupPublicationChecklist(),
			);
			const record = await new SocialPublicationIntents(f.dependencies).anchor(
				identity,
				f.proposal,
			);
			f.dependencies.approvals.request.mockResolvedValue(
				scenario === "missing-provenance"
					? { status: "approved", notificationFailed: false }
					: {
							status: "approved",
							actor: "revoked",
							decidedAt: "2026-10-20T10:00:00Z",
							notificationFailed: false,
						},
			);
			f.dependencies.canApprove.mockImplementation(
				async (actor) => actor !== "revoked",
			);

			// Act
			const result = review.requireCurrent(identity, f.proposal, record);

			// Assert
			await expect(result).rejects.toThrow();
		},
	);
	it.each([
		{ communication: [] },
		{ communication: [{ name: "Meetup event published", completed: false }] },
		{
			communication: [
				{ name: "Meetup event published", completed: true },
				{ name: "Meetup event published", completed: true },
			],
		},
	])(
		"blocks a valid registration URL without unambiguous published event evidence",
		async ({ communication }) => {
			// Arrange
			const f = await socialFixture();
			const context = f.state.context;
			if (!context) throw new Error("Missing social source fixture");
			f.state.context = {
				...context,
				event: {
					...context.event,
					operationalChecklists: {
						...context.event.operationalChecklists,
						communication,
					},
				},
			};
			const review = new SocialPublicationReview(
				f.dependencies,
				new SocialPublicationApprovalRequest(
					f.dependencies.timing,
					f.fingerprints,
				),
				new MeetupPublicationChecklist(),
			);
			// Act
			const result = await review.context(identity, f.proposal);
			// Assert
			expect(result).toBeUndefined();
			expect(f.dependencies.approvals.request).not.toHaveBeenCalled();
		},
	);
});
