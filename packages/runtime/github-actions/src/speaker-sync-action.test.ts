import { ProposalSourceError } from "@meetup-automation/referential";
import { SpeakerSynchronizationError } from "@meetup-automation/journey";
import * as core from "@actions/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionRunner } from "./action-runner.js";
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
	setFailed: vi.fn(),
	info: vi.fn(),
	warning: vi.fn(),
	summary: {
		addHeading: vi.fn().mockReturnThis(),
		addRaw: vi.fn().mockReturnThis(),
		write: vi.fn().mockResolvedValue(undefined),
		clear: vi.fn(),
	},
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
			"speaker_sync=blocked reason=private-repository-required",
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
	it("reports unexpected failures without exposing private exception contents", async () => {
		// Arrange
		boundary.synchronize.mockRejectedValue(
			new Error("private@example.test secret"),
		);
		// Act
		const report = await SpeakerSyncAction.run();
		// Assert
		expect(report.failure).toBeUndefined();
		expect(report.diagnostics[0].code).toBe("speaker-sync.unexpected");
		expect(boundary.setOutput.mock.calls.map(([name]) => name)).toEqual([
			"pr-body",
		]);
		expect(JSON.stringify(report)).not.toMatch(/private@example.test|secret/);
		expect(JSON.stringify(boundary.setOutput.mock.calls)).not.toMatch(
			/private@example.test|secret/,
		);
		expect(boundary.setOutput).toHaveBeenCalledWith(
			"pr-body",
			"- Unexpected technical failure during speaker synchronization.",
		);
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
		expect(report.failure).toBeUndefined();
		expect(report.details).toEqual(["speaker_sync=blocked stage=load-source"]);
		expect(report.diagnostics).toEqual([
			expect.objectContaining({
				code: "speaker-sync.rate-limited",
				severity: "error",
			}),
		]);
		expect(boundary.setOutput.mock.calls).toEqual([
			[
				"pr-body",
				"- Conference Hall rate limit reached; retry after the API cooldown.",
			],
		]);
	});

	it.each([
		["speaker-sync.mapping-required", false],
		["referential.speaker.email.invalid", false],
		["speaker-sync.unexpected", true],
	] as const)(
		"blocks candidate publication for %s and fails only technical errors",
		async (code, fails) => {
			// Arrange
			boundary.synchronize.mockRejectedValue(
				new SpeakerSynchronizationError("merge-speakers", undefined, [
					{ code, severity: "error", message: "Public diagnostic." },
				]),
			);

			// Act
			await ActionRunner.run(
				"action.referential.sync-speakers",
				SpeakerSyncAction.run,
				false,
			);

			// Assert
			expect(core.setFailed).toHaveBeenCalledTimes(fails ? 1 : 0);
			expect(boundary.setOutput.mock.calls.map(([name]) => name)).toEqual([
				"pr-body",
			]);
			expect(boundary.setOutput).toHaveBeenCalledWith(
				"pr-body",
				"- Public diagnostic.",
			);
		},
	);
});
