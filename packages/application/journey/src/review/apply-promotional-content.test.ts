import { SocialPostTiming } from "@meetup-automation/communication";
import { describe, expect, it, vi } from "vitest";
import {
	event,
	identity,
	sourceDocument,
} from "../../testing/meetup-journey.fixtures.js";
import { contentFixture } from "../../testing/promotional-content.fixtures.js";
import { ApplyPromotionalContent } from "./apply-promotional-content.js";

describe("content application", () => {
	it("rechecks the event-start cutoff after slow approval reads", async () => {
		// Arrange
		const f = contentFixture("slack-engineering:d0");
		const draft = {
			text: `Reminder ${f.plan.facts.registrationUrl}`,
			media: [],
		};
		const proposal = {
			...f.proposal,
			draft,
			revision: f.fingerprints.proposal(f.proposal, draft),
		};
		await f.store.save(await f.store.load(), [proposal]);
		const workspace = {
			read: vi.fn(async () => ({
				event,
				document: sourceDocument,
				plan: f.plan,
				destination: null,
			})),
			apply: vi.fn(),
		};
		const now = vi
			.fn()
			.mockReturnValueOnce("2026-10-28T17:44:59Z")
			.mockReturnValue("2026-10-28T17:45:01Z");
		const useCase = new ApplyPromotionalContent(
			f.store,
			workspace,
			workspace,
			{ approved: vi.fn(async () => draft) },
			f.policy,
			new SocialPostTiming(),
			now,
		);
		// Act
		const status = await useCase.execute(identity, proposal);
		const stored = await f.store.load();
		// Assert
		expect(status).toBe("stale");
		expect(stored.proposals[0]?.accepted).toBeNull();
		expect(workspace.apply).not.toHaveBeenCalled();
	});
	it.each(["unchanged", "manual-edit", "concurrent-edit", "revoked"])(
		"rechecks source and approval before applying %s",
		async (scenario) => {
			// Arrange
			const f = contentFixture();
			const draft = { text: "Approved title", media: [] };
			const proposal = {
				...f.proposal,
				draft,
				revision: f.fingerprints.proposal(f.proposal, draft),
				decision: {
					status: "approved" as const,
					actor: "organizer",
					decidedAt: "2026-10-01T10:00:00Z",
				},
			};
			await f.store.save(await f.store.load(), [proposal]);
			const context = {
				event,
				document: sourceDocument,
				plan: f.plan,
				destination:
					scenario === "manual-edit" ? "Human edit" : "Previous title",
			};
			const read = vi.fn().mockResolvedValue(context);
			if (scenario === "concurrent-edit")
				read
					.mockResolvedValueOnce(context)
					.mockResolvedValue({ ...context, destination: "New edit" });
			const workspace = { read, apply: vi.fn() };
			const approved = vi.fn().mockResolvedValue(draft);
			if (scenario === "revoked")
				approved.mockResolvedValueOnce(draft).mockResolvedValue(undefined);
			const useCase = new ApplyPromotionalContent(
				f.store,
				workspace,
				workspace,
				{ approved },
				f.policy,
				new SocialPostTiming(),
				() => "2026-10-01T10:00:00Z",
			);
			// Act
			const status = await useCase.execute(identity, proposal);
			// Assert
			expect(status).toBe(
				scenario === "unchanged"
					? "accepted"
					: scenario === "revoked"
						? "pending"
						: "stale",
			);
			expect(workspace.apply).toHaveBeenCalledTimes(
				scenario === "unchanged" ? 1 : 0,
			);
		},
	);
	it("does not expose a delayed reminder as scheduled or available", async () => {
		// Arrange
		const f = contentFixture("slack-engineering:d7");
		const draft = { text: "Reviewed reminder", media: [] };
		const proposal = {
			...f.proposal,
			draft,
			revision: f.fingerprints.proposal(f.proposal, draft),
		};
		await f.store.save(await f.store.load(), [proposal]);
		const workspace = {
			read: vi.fn(async () => ({
				event,
				document: sourceDocument,
				plan: f.plan,
				destination: null,
			})),
			apply: vi.fn(),
		};
		const useCase = new ApplyPromotionalContent(
			f.store,
			workspace,
			workspace,
			{ approved: vi.fn(async () => draft) },
			f.policy,
			new SocialPostTiming(),
			() => "2026-10-22T10:00:00Z",
		);
		// Act
		const status = await useCase.execute(identity, proposal);
		// Assert
		expect(status).toBe("stale");
		expect(workspace.apply).not.toHaveBeenCalled();
	});
});
