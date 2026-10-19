import { ProposalSourceError } from "@meetup-automation/referential";
import { SpeakerSynchronizationError } from "@meetup-automation/journey";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SpeakerSyncAction } from "./speaker-sync-action.js";
import { ActionMessages } from "./i18n/action-messages.js";

const boundary = vi.hoisted(() => ({
	get: vi.fn(),
	synchronize: vi.fn(),
	setOutput: vi.fn(),
	setSecret: vi.fn(),
}));
vi.mock("@actions/core", () => ({
	getInput: (name: string) =>
		name === "conference-hall-event" ? "example-cfp" : "secret",
	setOutput: boundary.setOutput,
	setSecret: boundary.setSecret,
}));
vi.mock("@actions/github", () => ({
	context: { repo: { owner: "example", repo: "meetups" } },
	getOctokit: () => ({ rest: { repos: { get: boundary.get } } }),
}));
vi.mock("../../../application/journey/src/index.js", async (original) => ({
	...(await original<object>()),
	SynchronizeSourceSpeakers: class {
		execute = boundary.synchronize;
	},
}));

describe("SpeakerSyncAction", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		boundary.get.mockResolvedValue({ data: { private: true } });
	});
	it("rejects a public destination before reading the source or writing contacts", async () => {
		// Arrange
		boundary.get.mockResolvedValue({ data: { private: false } });
		// Act
		const report = await SpeakerSyncAction.run();
		// Assert
		expect(report.failure).toBe(
			"Speaker synchronization requires a private repository.",
		);
		expect(boundary.synchronize).not.toHaveBeenCalled();
		expect(boundary.setOutput).not.toHaveBeenCalled();
	});
	it.each(["en", "fr"])(
		"reports safe counts and review guidance in %s",
		async (locale) => {
			// Arrange
			boundary.synchronize.mockResolvedValue({
				changed: true,
				speakerCount: 2,
			});
			// Act
			const report = await SpeakerSyncAction.run(new ActionMessages(locale));
			// Assert
			expect(report.failure).toBeUndefined();
			expect(report.details[0]).toContain("2");
			expect(
				boundary.setOutput.mock.calls.map(([name]) => name).sort(),
			).toEqual(["pr-body", "pr-title"]);

			expect(boundary.setSecret).toHaveBeenCalledWith("secret");
		},
	);
	it("fails without exposing private exception contents", async () => {
		// Arrange
		boundary.synchronize.mockRejectedValue(
			new Error("private@example.test secret"),
		);
		// Act
		const report = await SpeakerSyncAction.run();
		// Assert
		expect(report.failure).toBeDefined();
		expect(boundary.setOutput.mock.calls.map(([name]) => name)).toEqual([
			"pr-body",
		]);
		expect(JSON.stringify(report)).not.toMatch(/private@example.test|secret/);
		expect(JSON.stringify(boundary.setOutput.mock.calls)).not.toMatch(
			/private@example.test|secret/,
		);
		expect(boundary.setOutput).toHaveBeenCalledWith("pr-body", report.failure);
	});
	it("reports rate-limit diagnostics through the report and PR guidance", async () => {
		// Arrange
		boundary.synchronize.mockRejectedValue(
			new SpeakerSynchronizationError(
				"load-source",
				new ProposalSourceError("rate-limited", 120),
			),
		);
		// Act
		const report = await SpeakerSyncAction.run();
		// Assert
		expect(report.failure).toContain("loading the Conference Hall export");
		expect(report.diagnostics).toEqual([
			expect.objectContaining({
				code: "speaker-sync.rate-limited",
				severity: "error",
			}),
		]);
		expect(boundary.setOutput.mock.calls).toEqual([
			["pr-body", report.failure],
		]);
	});
});
