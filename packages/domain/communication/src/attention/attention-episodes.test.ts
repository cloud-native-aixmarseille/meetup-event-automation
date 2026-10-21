import { describe, expect, it } from "vitest";
import { condition, observation } from "../../testing/attention.fixtures.js";
import { CommunicationDomainComposition } from "../dependency-composition.js";
import { AttentionEpisodes } from "./attention-episodes.js";

describe("attention episodes", () => {
	it("retains unknown conditions and resolves only successfully evaluated owners", () => {
		// Arrange
		const now = new Date("2099-06-01T10:00:00Z");
		const first = new AttentionEpisodes({
			attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
		}).reconcile(undefined, observation(), now);

		// Act
		const unknown = new AttentionEpisodes({
			attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
		}).reconcile(first, observation({ conditions: [], evaluated: [] }), now);
		const resolved = new AttentionEpisodes({
			attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
		}).reconcile(unknown, observation({ conditions: [] }), now);
		const reopened = new AttentionEpisodes({
			attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
		}).reconcile(resolved, observation(), now);

		// Assert
		expect(unknown.episodes[0]?.status).toBe("unknown");
		expect(resolved.episodes[0]?.status).toBe("resolved");
		expect(reopened.episodes[0]?.episode).toBe(2);
	});
	it("recomputes date changes without replaying elapsed milestones", () => {
		// Arrange
		const now = new Date("2099-06-01T10:00:00Z");
		const first = new AttentionEpisodes({
			attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
		}).reconcile(undefined, observation(), now);
		new AttentionEpisodes({
			attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
		}).acknowledge(first, now);

		// Act
		const moved = new AttentionEpisodes({
			attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
		}).reconcile(first, observation({ eventDate: "2099-06-02" }), now);
		const dueNow = new AttentionEpisodes({
			attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
		}).due(moved, now);
		const dueTomorrow = new AttentionEpisodes({
			attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
		}).due(moved, new Date("2099-06-02T10:00:00Z"));

		// Assert
		expect(dueNow).toEqual([]);
		expect(dueTomorrow).toHaveLength(1);
		expect(moved.episodes[0]?.episode).toBe(1);
	});
	it("stops tasks but retains unknown external delivery on closure", () => {
		// Arrange
		const now = new Date("2099-06-01T10:00:00Z");
		const recovery = condition({
			key: "delivery-recovery:sha256:abc",
			code: "delivery-recovery",
			owner: "delivery",
			resource: "sha256:abc",
			recovery: true,
			policy: "daily",
		});
		const initial = new AttentionEpisodes({
			attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
		}).reconcile(
			undefined,
			observation({ conditions: [condition(), recovery] }),
			now,
		);

		// Act
		const stopped = new AttentionEpisodes({
			attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
		}).reconcile(
			initial,
			observation({ stopped: true, conditions: [], evaluated: [] }),
			now,
		);

		// Assert
		expect(stopped.episodes.map((item) => item.status)).toEqual([
			"stopped",
			"unknown",
		]);
	});
	it("does not mistake a missing delivery record for a verified resolution", () => {
		// Arrange
		const now = new Date("2099-06-01T10:00:00Z");
		const recovery = condition({
			key: "delivery-recovery:sha256:abc",
			code: "delivery-recovery",
			owner: "delivery",
			resource: "sha256:abc",
			recovery: true,
			policy: "daily",
		});
		const initial = new AttentionEpisodes({
			attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
		}).reconcile(undefined, observation({ conditions: [recovery] }), now);

		// Act
		const missing = new AttentionEpisodes({
			attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
		}).reconcile(
			initial,
			observation({ conditions: [], evaluated: ["delivery"] }),
			now,
		);
		const verified = new AttentionEpisodes({
			attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
		}).reconcile(
			missing,
			observation({
				conditions: [],
				evaluated: ["delivery"],
				verifiedRecovery: [recovery.key],
			}),
			now,
		);
		const later = new AttentionEpisodes({
			attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
		}).reconcile(verified, observation({ conditions: [], evaluated: [] }), now);

		// Assert
		expect(missing.episodes[0]?.status).toBe("unknown");
		expect(verified.episodes[0]?.status).toBe("resolved");
		expect(later.episodes[0]?.status).toBe("resolved");
	});
});
