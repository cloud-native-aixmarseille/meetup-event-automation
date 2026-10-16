import { describe, expect, it, vi } from "vitest";
import { createTestEvent } from "../../../../domain/event/testing/event.fixtures.js";
import { AutomationConfigFactory } from "../config/automation-config.js";
import {
	ManageMeetupAttention,
	type ManageMeetupAttentionDependencies,
} from "./manage-meetup-attention.js";
function fixture() {
	const event = createTestEvent({ date: "2099-06-08" });
	const document = {
		identity: event.identity,
		issueState: "open" as const,
		issueTitle: "Public meetup",
		labels: ["meetup"],
		body: "private@example.test",
	};
	const execute = vi
		.fn()
		.mockResolvedValue({ active: 1, posted: false, notificationFailed: false });
	const find = vi.fn().mockResolvedValue(document);
	const dependencies: ManageMeetupAttentionDependencies = {
		config: AutomationConfigFactory.createAutomationConfig(),
		repository: { find, applyPatch: vi.fn(), listPage: vi.fn() },
		codec: { decode: () => ({ event, diagnostics: [] }), createPatch: vi.fn() },
		followUp: { synchronizeFollowUp: vi.fn().mockResolvedValue(undefined) },
		approvals: { readAttention: vi.fn().mockResolvedValue([]) },
		recovery: { readAttention: vi.fn().mockResolvedValue([]) },
		reconciliation: { execute },
		clock: { now: () => new Date("2099-06-01T10:00:00Z") },
	};
	return {
		dependencies,
		find,
		execute,
		document,
		useCase: new ManageMeetupAttention(dependencies),
	};
}
describe("meetup attention journey", () => {
	it("rechecks the issue and forwards public facts despite a failed dependency", async () => {
		// Arrange
		const f = fixture();
		// Act
		const result = await f.useCase.execute(
			f.document.identity,
			[{ owner: "assets", outcome: "failure", blocked: false }],
			"123",
		);
		const observation = f.execute.mock.calls[0]?.[0];
		// Assert
		expect(result.skipped).toBe(false);
		expect(f.find).toHaveBeenCalledTimes(2);
		expect(observation.conditions).toContainEqual(
			expect.objectContaining({ code: "integration-failure", owner: "assets" }),
		);
		expect(JSON.stringify(observation)).not.toContain("private@example.test");
	});
	it("keeps unavailable evidence unknown while still persisting GitHub status", async () => {
		// Arrange
		const f = fixture();
		vi.mocked(f.dependencies.recovery.readAttention).mockRejectedValue(
			new Error("provider payload"),
		);
		// Act
		const result = await f.useCase.execute(f.document.identity, []);
		// Assert
		expect(result.notificationFailed).toBe(true);
		expect(f.execute).toHaveBeenCalledWith(
			expect.objectContaining({
				conditions: expect.arrayContaining([
					expect.objectContaining({ code: "stage-unknown", owner: "delivery" }),
				]),
			}),
			undefined,
		);
	});
	it("refuses to notify from a stale issue snapshot", async () => {
		// Arrange
		const f = fixture();
		f.find
			.mockResolvedValueOnce(f.document)
			.mockResolvedValueOnce({ ...f.document, body: "updated" });
		// Act
		const execute = f.useCase.execute(f.document.identity, []);
		// Assert
		await expect(execute).rejects.toThrow("changed during evaluation");
		expect(f.execute).not.toHaveBeenCalled();
	});
	it("skips unrelated issues", async () => {
		// Arrange
		const f = fixture();
		f.find.mockResolvedValue({ ...f.document, labels: [] });
		// Act
		const result = await f.useCase.execute(f.document.identity, []);
		// Assert
		expect(result.skipped).toBe(true);
		expect(f.execute).not.toHaveBeenCalled();
	});
});
