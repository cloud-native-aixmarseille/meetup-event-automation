import { describe, expect, it, vi } from "vitest";
import { event } from "../../testing/meetup-journey.fixtures.js";
import { contentFixture } from "../../testing/promotional-content.fixtures.js";
import { ContentFactsProjection } from "../review/content-facts-projection.js";
import { EventCopyApprovalGate } from "./event-copy-approval-gate.js";

describe("downstream content authorization", () => {
	it.each(["unchanged", "edited", "revoked", "changed-talk"])(
		"checks the accepted values and current authority for %s",
		async (scenario) => {
			// Arrange
			const f = contentFixture();
			const projection = new ContentFactsProjection();
			const settings = {
				content: {
					months: {},
					mentions: [],
					reminderTime: "09:00",
					guidance: "",
				},
				publication: { startTime: "18:45", endTime: "21:00", venues: {} },
			};
			const plan = f.plans.create(
				"title",
				"fr",
				projection.create(
					event,
					settings.publication,
					settings.content,
					null,
					"title",
				),
				"09:00",
			);
			const draft = { text: event.eventTitle, media: [] };
			const proposal = {
				...f.proposal,
				plan,
				draft,
				revision: f.fingerprints.proposal({ ...f.proposal, plan }, draft),
				decision: {
					status: "approved" as const,
					actor: "organizer",
					decidedAt: "2026-10-01T10:00:00Z",
				},
				accepted: draft,
			};
			await f.store.save(await f.store.load(), [proposal]);
			const authority = {
				authorized: vi.fn(async () => scenario !== "revoked"),
			};
			const gate = new EventCopyApprovalGate(
				f.store,
				authority,
				projection,
				f.plans,
				f.policy,
				async () => settings,
			);
			const source =
				scenario === "edited"
					? { ...event, eventTitle: "Unreviewed edit" }
					: scenario === "changed-talk"
						? {
								...event,
								agenda: [
									{
										...event.agenda[0],
										description: "Different topic",
										proposal: undefined,
									},
								],
							}
						: event;
			// Act
			const blocked = await gate.blocked(source);
			// Assert
			expect(blocked).toEqual(scenario === "unchanged" ? [] : ["title"]);
		},
	);
	it("leaves fields without proposals under their existing rules", async () => {
		// Arrange
		const f = contentFixture();
		const store = {
			load: vi.fn(async () => ({ revision: "empty", proposals: [] })),
			save: vi.fn(),
		};
		const settings = vi.fn();
		const authority = { authorized: vi.fn() };
		const gate = new EventCopyApprovalGate(
			store,
			authority,
			new ContentFactsProjection(),
			f.plans,
			f.policy,
			settings,
		);
		// Act
		const blocked = await gate.blocked(event);
		// Assert
		expect(blocked).toEqual([]);
		expect(settings).not.toHaveBeenCalled();
		expect(authority.authorized).not.toHaveBeenCalled();
	});
});
