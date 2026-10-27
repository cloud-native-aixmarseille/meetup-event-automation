import { describe, expect, it } from "vitest";
import type { SocialDeliveryRecord } from "@meetup-automation/communication";
import { identity } from "../../testing/meetup-journey.fixtures.js";
import { socialFixture } from "../../testing/social-publication.fixtures.js";
import { SocialPublicationIntents } from "./social-publication-intents.js";

describe("social delivery identity", () => {
	it.each([false, true])(
		"retains uploaded media history and selects reuse after explicit recovery=%s",
		async (recovered) => {
			// Arrange
			const f = await socialFixture("linkedin:announcement");
			const intents = new SocialPublicationIntents(f.dependencies);
			const revision = f.proposal.revision;
			if (!revision) throw new Error("Missing synthetic revision");
			const media = {
				assetUrn: "urn:li:image:initialized-asset",
				fingerprint: "a".repeat(64),
				description: "Reviewed artwork",
			};
			const record: SocialDeliveryRecord = {
				intentId: "intent-one",
				occurrence: f.plan.facts.date,
				purpose: "announcement",
				destination: f.destination,
				attempts: [
					{
						id: "attempt-initial",
						revision,
						reservedAt: "2026-10-20T12:00:00Z",
						status: "deferred",
						media,
						code: "upload-rate-limited",
						...(recovered
							? {
									recovery: {
										actor: "organizer",
										decidedAt: "2026-10-20T13:00:00Z",
										outcome: "not-published",
										reference:
											"https://github.com/example/events/issues/42#issuecomment-100",
									},
								}
							: {}),
					},
				],
			};
			f.records.set(record.intentId, record);
			f.state.now = "2026-10-20T14:00:00Z";

			// Act
			const reserved = await intents.reserve(record, revision);

			// Assert
			expect(reserved.attempts[0]).toEqual(record.attempts[0]);
			expect(reserved.attempts[1].media).toEqual(recovered ? undefined : media);
			expect(reserved.attempts[1].status).toBe("reserved");
		},
	);
	it("keeps the same intent when a destination key or label changes", async () => {
		// Arrange
		const f = await socialFixture();
		const intents = new SocialPublicationIntents(f.dependencies);
		const destination = {
			...f.destination,
			key: "renamed",
			label: "New label",
		};
		const plan = f.plans.create(
			"renamed:announcement",
			"fr",
			f.plan.facts,
			"09:00",
			destination,
		);
		const renamed = { ...f.proposal, id: "renamed-proposal", plan };

		// Act
		const first = await intents.anchor(identity, f.proposal);
		await f.store.save(await f.store.load(), [
			(await f.store.load()).proposals[0],
			renamed,
		]);
		const second = await intents.anchor(identity, renamed);

		// Assert
		expect(second.intentId).toBe(first.intentId);
		expect(second.destination).toEqual(first.destination);
		expect(f.records.size).toBe(1);
	});
	it.each(["channel", "occurrence", "purpose"])(
		"creates independent identity for another %s",
		async (change) => {
			// Arrange
			const f = await socialFixture();
			const intents = new SocialPublicationIntents(f.dependencies);
			const destination =
				change === "channel"
					? { ...f.destination, channelId: "COTHER" }
					: f.plan.destination;
			const facts =
				change === "occurrence"
					? { ...f.plan.facts, date: "2026-11-04" }
					: f.plan.facts;
			const plan = f.plans.create(
				change === "purpose" ? "slack-engineering:d7" : f.plan.target,
				"fr",
				facts,
				"09:00",
				destination,
			);
			const next = { ...f.proposal, id: "next-proposal", plan };

			// Act
			const first = await intents.anchor(identity, f.proposal);
			await f.store.save(await f.store.load(), [
				(await f.store.load()).proposals[0],
				next,
			]);
			const second = await intents.anchor(identity, next);

			// Assert
			expect(second.intentId).not.toBe(first.intentId);
			expect(f.records.size).toBe(2);
		},
	);
});
