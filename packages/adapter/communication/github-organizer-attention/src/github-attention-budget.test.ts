import type { AttentionBudgetSlot } from "@meetup-automation/communication";
import type { AutomationStateScope } from "@meetup-automation/journey";
import { describe, expect, it, vi } from "vitest";
import { GithubOrganizerAttentionComposition } from "./dependency-composition.js";
import { GithubAttentionBudget } from "./github-attention-budget.js";

function fixture() {
	const records = new Map<number, readonly string[]>();
	const codec =
		new GithubOrganizerAttentionComposition().attentionBudgetRecord();
	const source = { issues: vi.fn(async () => [...records.keys()]) };
	const write = vi.fn(
		async (
			issue: number,
			_scope: AutomationStateScope,
			previous: readonly string[],
			next: readonly string[],
		) => {
			expect(records.get(issue) ?? []).toEqual(previous);
			records.set(issue, next);
		},
	);
	const create = (issue: number) => ({
		read: vi.fn(async () => records.get(issue) ?? []),
		write: async (
			scope: AutomationStateScope,
			previous: readonly string[],
			next: readonly string[],
		) => write(issue, scope, previous, next),
	});
	return {
		records,
		codec,
		source,
		write,
		subject: new GithubAttentionBudget(source, create, codec, 42, "C123"),
	};
}
const slot: AttentionBudgetSlot = {
	key: "41:attention:100:100",
	day: 100,
	status: "pending",
};
describe("technical-comment notification budget", () => {
	it("counts other issues in the same channel while keeping channels isolated", async () => {
		// Arrange
		const f = fixture();
		f.records.set(41, [
			f.codec.write({ channel: "C123", slots: [slot] }),
			f.codec.write({ channel: "C456", slots: [slot] }),
		]);
		// Act
		const loaded = await f.subject.load(100);
		// Assert
		expect(loaded.slots).toEqual([slot]);
		expect(f.write).not.toHaveBeenCalled();
	});
	it("writes only this issue's reservation and preserves its other channel records", async () => {
		// Arrange
		const f = fixture();
		const otherChannel = f.codec.write({ channel: "C456", slots: [] });
		f.records.set(41, [f.codec.write({ channel: "C123", slots: [slot] })]);
		f.records.set(42, [otherChannel]);
		const own = { ...slot, key: "42:attention:100:100" };
		// Act
		const previous = await f.subject.load(100);
		const saved = await f.subject.save(previous, [...previous.slots, own]);
		// Assert
		expect(saved).toBe(true);
		expect(f.records.get(42)).toEqual([
			otherChannel,
			f.codec.write({ channel: "C123", slots: [own] }),
		]);
		expect(f.records.get(41)).toEqual([
			f.codec.write({ channel: "C123", slots: [slot] }),
		]);
	});
	it("refuses a stale local budget snapshot", async () => {
		// Arrange
		const f = fixture();
		const previous = await f.subject.load(100);
		f.records.set(42, [f.codec.write({ channel: "C123", slots: [] })]);
		// Act
		const saved = await f.subject.save(previous, []);
		// Assert
		expect(saved).toBe(false);
		expect(f.write).not.toHaveBeenCalled();
	});
	it.each(["duplicate", "foreign", "malformed"])(
		"fails closed on %s budget evidence",
		async (kind) => {
			// Arrange
			const f = fixture();
			const record = f.codec.write({ channel: "C123", slots: [slot] });
			f.records.set(
				kind === "foreign" ? 42 : 41,
				kind === "duplicate"
					? [record, record]
					: kind === "malformed"
						? ["invalid"]
						: [record],
			);
			// Act
			const loaded = f.subject.load(100);
			// Assert
			await expect(loaded).rejects.toThrow();
			expect(f.write).not.toHaveBeenCalled();
		},
	);
	it("does not invent an empty budget after a repository scan failure", async () => {
		// Arrange
		const f = fixture();
		f.source.issues.mockRejectedValueOnce(new Error("unavailable"));
		// Act
		const loaded = f.subject.load(100);
		// Assert
		await expect(loaded).rejects.toThrow("unavailable");
	});
});
