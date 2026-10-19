import { describe, expect, it, vi } from "vitest";
import { contentFixture } from "../../testing/promotional-content.fixtures.js";
import { ContentProposalFactory } from "./content-proposal-factory.js";
import { PreparePromotionalContent } from "./prepare-promotional-content.js";

describe("generation intents", () => {
	it("reuses the current proposal on ordinary reruns", async () => {
		// Arrange
		const f = contentFixture();
		const useCase = new PreparePromotionalContent(
			f.store,
			f.factory,
			f.policy,
			vi.fn(async () => true),
		);
		// Act
		const proposal = await useCase.execute(
			f.plan,
			f.proposal.origin,
			"",
			"",
			[],
		);
		// Assert
		expect(proposal?.id).toBe(f.proposal.id);
		expect(f.store.save).not.toHaveBeenCalled();
	});
	it("creates one new intent for a verified iteration and reuses it", async () => {
		// Arrange
		const f = contentFixture();
		const before = await f.store.load();
		await f.store.save(before, [
			{
				...f.proposal,
				decision: {
					status: "iteration-requested",
					actor: "organizer",
					decidedAt: "2026-09-21T12:00:00Z",
				},
			},
		]);
		const factory = new ContentProposalFactory(
			() => "00000000-0000-4000-8000-000000000002",
			() => "2026-09-21T12:01:00Z",
		);
		const authorize = vi.fn(async () => true);
		const useCase = new PreparePromotionalContent(
			f.store,
			factory,
			f.policy,
			authorize,
		);
		// Act
		const first = await useCase.execute(
			f.plan,
			f.proposal.origin,
			"More concise",
			"",
			[],
		);
		const rerun = await useCase.execute(
			f.plan,
			f.proposal.origin,
			"More concise",
			"",
			[],
		);
		// Assert
		expect(first?.id).not.toBe(f.proposal.id);
		expect(rerun?.id).toBe(first?.id);
		expect(authorize).toHaveBeenCalledWith("organizer");
	});
	it("requires explicit recovery before replacing an uncertain request", async () => {
		// Arrange
		const f = contentFixture();
		const before = await f.store.load();
		await f.store.save(before, [
			{ ...f.proposal, attempts: [{ id: "reserved", phase: "reserved" }] },
		]);
		const recovery = {
			id: "comment:revision",
			actor: "organizer",
			proposalId: f.proposal.id,
			guidance: "Try a new scene",
		};
		const factory = new ContentProposalFactory(
			() => "00000000-0000-4000-8000-000000000002",
			() => "2026-09-21T12:01:00Z",
		);
		const useCase = new PreparePromotionalContent(
			f.store,
			factory,
			f.policy,
			vi.fn(async () => true),
		);
		// Act
		const first = await useCase.execute(f.plan, f.proposal.origin, "", "", []);
		const recovered = await useCase.execute(f.plan, f.proposal.origin, "", "", [
			recovery,
		]);
		// Assert
		expect(first?.id).toBe(f.proposal.id);
		expect(recovered?.id).not.toBe(f.proposal.id);
		expect(recovered?.recoveryRequest).toEqual(recovery);
		expect(recovered?.guidance).toBe(recovery.guidance);
	});
	it("preserves an uncertain request even when its source facts change", async () => {
		// Arrange
		const f = contentFixture();
		await f.store.save(await f.store.load(), [
			{ ...f.proposal, attempts: [{ id: "reserved", phase: "reserved" }] },
		]);
		const useCase = new PreparePromotionalContent(
			f.store,
			f.factory,
			f.policy,
			vi.fn(async () => true),
		);
		const changed = f.plans.create(
			"title",
			"fr",
			{
				...f.plan.facts,
				talks: f.plan.facts.talks.map((talk) => ({
					...talk,
					title: "Changed topic",
				})),
			},
			"09:00",
		);
		// Act
		const proposal = await useCase.execute(
			changed,
			f.proposal.origin,
			"",
			"",
			[],
		);
		// Assert
		expect(proposal?.id).toBe(f.proposal.id);
		expect(proposal?.plan.sourceFingerprint).not.toBe(
			changed.sourceFingerprint,
		);
	});
});
