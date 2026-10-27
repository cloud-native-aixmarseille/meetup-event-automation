import { MeetupPublicationChecklist } from "@meetup-automation/event";
import { describe, expect, it } from "vitest";
import { identity } from "../../testing/meetup-journey.fixtures.js";
import { socialFixture } from "../../testing/social-publication.fixtures.js";
import { SocialPublicationApprovalRequest } from "./social-publication-approval-request.js";
import { SocialPublicationDelivery } from "./social-publication-delivery.js";
import { SocialPublicationIntents } from "./social-publication-intents.js";
import { SocialPublicationReview } from "./social-publication-review.js";

describe("social delivery effects", () => {
	it("retains prepared media before posting and reuses it after a definite deferral", async () => {
		// Arrange
		const f = await socialFixture("linkedin:announcement");
		const intents = new SocialPublicationIntents(f.dependencies);
		const requests = new SocialPublicationApprovalRequest(
			f.dependencies.timing,
			f.fingerprints,
		);
		const delivery = new SocialPublicationDelivery(
			f.dependencies,
			intents,
			new SocialPublicationReview(
				f.dependencies,
				requests,
				new MeetupPublicationChecklist(),
			),
		);
		const media = {
			assetUrn: "urn:li:image:synthetic",
			fingerprint: f.draft.media[0].fingerprint,
			description: "Reviewed image",
		};
		f.images.prepare.mockImplementation(async (_input, guard, record) => {
			await guard();
			await record(media);
			return { status: "ready", media };
		});
		const publish = f.publish;
		let retained = false;
		f.posts.publish
			.mockImplementationOnce(async () => {
				retained =
					[...f.records.values()][0].attempts.at(-1)?.media?.assetUrn ===
					media.assetUrn;
				return {
					status: "deferred",
					code: "rate-limit",
					retryAfterSeconds: 120,
				};
			})
			.mockImplementation(publish);
		const initial = await intents.anchor(identity, f.proposal);

		// Act
		const first = await delivery.publish(identity, f.proposal, initial);
		const deferred = [...f.records.values()][0];
		f.state.now = "2026-10-20T12:02:00Z";
		const second = await delivery.publish(identity, f.proposal, deferred);

		// Assert
		expect([first, second]).toEqual(["scheduled", "published"]);
		expect(retained).toBe(true);
		expect(deferred.attempts[0].retryAt).toBe("2026-10-20T12:02:00.000Z");
		expect(f.images.prepare).toHaveBeenCalledTimes(1);
		expect(f.posts.publish.mock.calls[1][0].media).toEqual(media);
	});
	it("does not upload bytes that differ from the reviewed image", async () => {
		// Arrange
		const f = await socialFixture("linkedin:announcement");
		const intents = new SocialPublicationIntents(f.dependencies);
		const requests = new SocialPublicationApprovalRequest(
			f.dependencies.timing,
			f.fingerprints,
		);
		const delivery = new SocialPublicationDelivery(
			f.dependencies,
			intents,
			new SocialPublicationReview(
				f.dependencies,
				requests,
				new MeetupPublicationChecklist(),
			),
		);
		f.dependencies.imageFingerprint.of.mockReturnValue("changed");
		const initial = await intents.anchor(identity, f.proposal);

		// Act
		const result = await delivery.publish(identity, f.proposal, initial);

		// Assert
		expect(result).toBe("blocked");
		expect([...f.records.values()][0].attempts.at(-1)?.status).toBe("stale");
		expect(f.images.prepare).not.toHaveBeenCalled();
		expect(f.posts.publish).not.toHaveBeenCalled();
	});
});
