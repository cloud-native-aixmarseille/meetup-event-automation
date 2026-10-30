import { describe, expect, it } from "vitest";
import type {
	AttentionChecklistEntry,
	AttentionChecklistField,
} from "./attention-checklist.js";
import { AttentionTaskSelection } from "./attention-task-selection.js";
import type { AttentionEpisode, AttentionState } from "./model.js";

const state: AttentionState = {
	eventDate: "2099-06-08",
	stopped: false,
	episodes: [],
};
function episode(
	code: AttentionEpisode["condition"]["code"],
	resource = "event",
): AttentionEpisode {
	return {
		condition: {
			code,
			resource,
			key: `${code}:${resource}`,
			owner: "event",
			severity: "warning",
			policy: "preparation",
		},
		episode: 1,
		openedAt: "2099-06-01T10:00:00Z",
		status: "active",
	};
}
function entry(
	field: AttentionChecklistField,
	action?: AttentionChecklistEntry["action"],
): AttentionChecklistEntry {
	return { field, action, label: "Public field", description: "Public task" };
}
describe("organizer attention task selection", () => {
	it.each([
		["missing-date", "date"],
		["host-confirmation", "host"],
		["speaker-confirmation", "speaker-confirmation"],
	] as const)(
		"uses a concrete %s task in place of its generic reminder",
		(code, field) => {
			// Arrange
			const condition = episode(code);
			const concrete = entry(field);

			// Act
			const result = new AttentionTaskSelection().select(
				{ state, conditions: [condition] },
				{ entries: [concrete] },
			);

			// Assert
			expect(result.details).toEqual([]);
			expect(result.remaining).toEqual([]);
			expect(result.checklist).toEqual([concrete]);
		},
	);
	it("retains unrelated confirmations and technical failures with concrete tasks", () => {
		// Arrange
		const conditions = [
			episode("host-confirmation"),
			episode("integration-failure", "communications"),
		];

		// Act
		const result = new AttentionTaskSelection().select(
			{ state, conditions },
			{ entries: [entry("date")] },
		);

		// Assert
		expect(result.urgent).toEqual([conditions[1]]);
		expect(result.remaining).toEqual([conditions[0]]);
		expect(result.details).toEqual(conditions);
	});
	it.each([
		["approval-pending", "revision", "email-approval"],
		["approval-pending", "content-review:revision", "content-approval"],
		["approval-pending", "meetup-publication:revision", "meetup-approval"],
		["approval-pending", "social-publication:revision", "social-approval"],
		[
			"approval-pending",
			"community-publication:revision",
			"community-approval",
		],
		["delivery-recovery", "reservation", "delivery-recovery"],
	] as const)(
		"keeps the actionable link for %s instead of an equivalent diagnostic",
		(code, resource, action) => {
			// Arrange
			const condition = episode(code, resource);
			condition.condition = { ...condition.condition, commentId: 200 };

			// Act
			const result = new AttentionTaskSelection().select(
				{ state, conditions: [condition] },
				{ entries: [entry("other", action)] },
			);

			// Assert
			expect(result.urgent).toEqual([condition]);
			expect(result.checklist).toEqual([]);
			expect(result.details).toEqual([]);
		},
	);
	it("preserves unverified recovery and suppresses stopped diagnostic tasks", () => {
		// Arrange
		const condition = episode("delivery-recovery");
		condition.status = "unknown";

		// Act
		const result = new AttentionTaskSelection().select(
			{ state: { ...state, stopped: true }, conditions: [condition] },
			{ entries: [entry("other", "delivery-recovery")] },
		);

		// Assert
		expect(result.details).toEqual([condition]);
		expect(result.urgent).toEqual([condition]);
		expect(result.checklist).toEqual([]);
	});
	it("leaves follow-up tasks to the shared progress document while preserving notification actions", () => {
		// Arrange
		const condition = episode("follow-up", "share-slides");

		// Act
		const result = new AttentionTaskSelection().select(
			{ state: { ...state, commentId: 200 }, conditions: [condition] },
			{ entries: [] },
		);

		// Assert
		expect(result.details).toEqual([]);
		expect(result.remaining).toEqual([condition]);
	});
});
