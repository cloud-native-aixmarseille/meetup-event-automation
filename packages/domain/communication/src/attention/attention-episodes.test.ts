import { describe, expect, it } from "vitest";
import { condition, observation } from "../../testing/attention.fixtures.js";
import { AttentionEpisodes } from "./attention-episodes.js";

describe("attention episodes", () => {
	it("retains unknown conditions and resolves only successfully evaluated owners", () => {
		// Arrange
		const now = new Date("2099-06-01T10:00:00Z");
		const first = AttentionEpisodes.reconcile(undefined, observation(), now);

		// Act
		const unknown = AttentionEpisodes.reconcile(
			first,
			observation({ conditions: [], evaluated: [] }),
			now,
		);
		const resolved = AttentionEpisodes.reconcile(
			unknown,
			observation({ conditions: [] }),
			now,
		);
		const reopened = AttentionEpisodes.reconcile(resolved, observation(), now);

		// Assert
		expect(unknown.episodes[0]?.status).toBe("unknown");
		expect(resolved.episodes[0]?.status).toBe("resolved");
		expect(reopened.episodes[0]?.episode).toBe(2);
	});
	it("recomputes date changes without replaying elapsed milestones", () => {
		// Arrange
		const now = new Date("2099-06-01T10:00:00Z");
		const first = AttentionEpisodes.reconcile(undefined, observation(), now);
		AttentionEpisodes.acknowledge(first, now);

		// Act
		const moved = AttentionEpisodes.reconcile(
			first,
			observation({ eventDate: "2099-06-02" }),
			now,
		);
		const dueNow = AttentionEpisodes.due(moved, now);
		const dueTomorrow = AttentionEpisodes.due(
			moved,
			new Date("2099-06-02T10:00:00Z"),
		);

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
		const initial = AttentionEpisodes.reconcile(
			undefined,
			observation({ conditions: [condition(), recovery] }),
			now,
		);

		// Act
		const stopped = AttentionEpisodes.reconcile(
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
		const initial = AttentionEpisodes.reconcile(
			undefined,
			observation({ conditions: [recovery] }),
			now,
		);

		// Act
		const missing = AttentionEpisodes.reconcile(
			initial,
			observation({ conditions: [], evaluated: ["delivery"] }),
			now,
		);
		const verified = AttentionEpisodes.reconcile(
			missing,
			observation({
				conditions: [],
				evaluated: ["delivery"],
				verifiedRecovery: [recovery.key],
			}),
			now,
		);
		const later = AttentionEpisodes.reconcile(
			verified,
			observation({ conditions: [], evaluated: [] }),
			now,
		);

		// Assert
		expect(missing.episodes[0]?.status).toBe("unknown");
		expect(verified.episodes[0]?.status).toBe("resolved");
		expect(later.episodes[0]?.status).toBe("resolved");
	});
});
