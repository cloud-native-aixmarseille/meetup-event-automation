import { describe, expect, it } from "vitest";
import { identity } from "../../testing/meetup-journey.fixtures.js";
import { socialDestinations } from "../../testing/promotional-content.fixtures.js";
import { remindersFixture } from "../../testing/social-reminders.fixtures.js";
import { PrepareSocialReminders } from "./prepare-social-reminders.js";

describe("automatic social reminder preparation", () => {
	it("creates each reminder once and reuses drafts on subsequent scans", async () => {
		// Arrange
		const f = await remindersFixture();
		// Act
		const first = await f.prepare.execute(
			identity,
			socialDestinations,
			f.origin,
			"Concise",
		);
		const second = await f.prepare.execute(
			identity,
			socialDestinations,
			f.origin,
			"Changed guidance",
		);
		const stored = await f.store.load();
		// Assert
		expect(f.prepare).toBeInstanceOf(PrepareSocialReminders);
		expect(first.results).toHaveLength(4);
		expect(second).toEqual(first);
		expect(first.diagnostics).toEqual([]);
		expect(stored.proposals).toHaveLength(4);
		expect(f.textGenerator.generate).toHaveBeenCalledTimes(4);
		expect(
			stored.proposals.every(
				(p) => p.decision === null && !p.publicationIntent,
			),
		).toBe(true);
	});
	it("catches up the event-day reminder without creating an expired D-7 draft", async () => {
		// Arrange
		const f = await remindersFixture();
		f.state.now = "2026-10-28T10:00:00Z";
		// Act
		const result = await f.prepare.execute(
			identity,
			socialDestinations,
			f.origin,
			"",
		);
		// Assert
		expect(result.results.map((r) => r.target)).toEqual([
			"slack-engineering:d0",
			"linkedin:d0",
		]);
		expect(f.textGenerator.generate).toHaveBeenCalledTimes(2);
	});
	it.each(["approved", "rejected", "iteration-requested"] as const)(
		"retains an existing %s draft and its delivery identity",
		async (status) => {
			// Arrange
			const f = await remindersFixture();
			f.state.now = "2026-10-28T10:00:00Z";
			const retained = {
				...f.proposal,
				draft: { text: "Human-edited reminder", media: [] },
				publicationIntent: "delivery-one",
				decision: { status, actor: "organizer", decidedAt: f.state.now },
			};
			await f.store.save(await f.store.load(), [retained]);
			// Act
			await f.prepare.execute(identity, [socialDestinations[0]], f.origin, "");
			const stored = await f.store.load();
			// Assert
			expect(stored.proposals).toEqual([retained]);
			expect(f.textGenerator.generate).not.toHaveBeenCalled();
		},
	);
	it("keeps an uncertain generation reserved and continues other destinations", async () => {
		// Arrange
		const f = await remindersFixture();
		f.state.now = "2026-10-28T10:00:00Z";
		f.textGenerator.generate.mockRejectedValueOnce(
			new Error("private provider response"),
		);
		// Act
		const first = await f.prepare.execute(
			identity,
			socialDestinations,
			f.origin,
			"",
		);
		const second = await f.prepare.execute(
			identity,
			socialDestinations,
			f.origin,
			"",
		);
		// Assert
		expect(first.results.map((r) => r.status)).toEqual(["failed", "complete"]);
		expect(second.results.map((r) => r.status)).toEqual([
			"recovery",
			"complete",
		]);
		expect(f.textGenerator.generate).toHaveBeenCalledTimes(2);
		expect(first.diagnostics[0].code).toBe(
			"communication.social.preparation-failed",
		);
		expect(second.diagnostics[0].field).toBe("social.slack-engineering.d0");
		expect(JSON.stringify(first)).not.toContain("private provider response");
	});
	it("resumes a persisted draft that has not reserved a generation request", async () => {
		// Arrange
		const f = await remindersFixture();
		f.state.now = "2026-10-28T10:00:00Z";
		await f.store.save(await f.store.load(), [
			{ ...f.proposal, plan: { ...f.proposal.plan, facts: f.state.facts } },
		]);
		// Act
		const result = await f.prepare.execute(
			identity,
			[socialDestinations[0]],
			f.origin,
			"",
		);
		// Assert
		expect(result.results[0].status).toBe("complete");
		expect(f.textGenerator.generate).toHaveBeenCalledTimes(1);
	});
	it("reports missing prerequisites without calling the model", async () => {
		// Arrange
		const f = await remindersFixture();
		f.state.facts.registrationUrl = "";
		// Act
		const result = await f.prepare.execute(
			identity,
			[socialDestinations[0]],
			f.origin,
			"",
		);
		// Assert
		expect(result.diagnostics.map((d) => d.code)).toEqual([
			"communication.social.missing",
			"communication.social.missing",
		]);
		expect(f.textGenerator.generate).not.toHaveBeenCalled();
	});
});
