import * as core from "@actions/core";
import { ConferenceHallProposalSourceComposition } from "@meetup-automation/conference-hall-proposal-source";
import { CsvReferentialRepositoryComposition } from "@meetup-automation/csv-referential-repository";
import {
	JourneyPolicyComposition,
	SpeakerSynchronizationError,
} from "@meetup-automation/journey";
import { LocalizationComposition } from "@meetup-automation/localization";
import {
	ProposalSourceError,
	SpeakerCatalogHistoryError,
} from "@meetup-automation/referential";
import { YamlIssueFormProjectionComposition } from "@meetup-automation/yaml-issue-form-projection";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GithubActionsComposition } from "./dependency-composition.js";
import { ActionMessages } from "./i18n/action-messages.js";
import { SpeakerSyncAction } from "./speaker-sync-action.js";

const boundary = vi.hoisted(() => ({
	get: vi.fn(),
	config: vi.fn(),
	synchronize: vi.fn(),
	createSynchronizer: vi.fn(),
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

describe("SpeakerSyncAction", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		boundary.config.mockImplementation((owner: string) =>
			new JourneyPolicyComposition()
				.automationConfigFactory()
				.createAutomationConfig(owner),
		);
		boundary.get.mockResolvedValue({ data: { private: true } });
	});
	it("rejects a public destination before reading the source or writing contacts", async () => {
		// Arrange
		boundary.get.mockResolvedValue({ data: { private: false } });

		// Act
		const report = await subject().run();

		// Assert
		expect(report.failure).toBe(
			"speaker_sync=blocked reason=private-repository-required",
		);
		expect(boundary.synchronize).not.toHaveBeenCalled();
		expect(boundary.setOutput).not.toHaveBeenCalled();
	});
	it("passes the shared event configuration to speaker synchronization", async () => {
		// Arrange
		const config = new JourneyPolicyComposition()
			.automationConfigFactory()
			.createAutomationConfig("example");
		const event = {
			...config.event,
			"issue-form": ".github/ISSUE_TEMPLATE/community-event.yml",
			"occurrence-status-field": "occurrence",
		};
		boundary.config.mockReturnValueOnce({ ...config, event });
		boundary.synchronize.mockResolvedValue({ changed: false, speakerCount: 0 });

		// Act
		await subject().run();

		// Assert
		expect(boundary.createSynchronizer.mock.calls[0][3]).toBe(event);
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
			const report = await subject().run(
				new ActionMessages(
					{ localeResolver: new LocalizationComposition().localeResolver() },
					locale,
				),
			);

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
		const report = await subject().run();

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
		const report = await subject().run();

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

	it("fails the action for unavailable catalog history and emits only safe retry guidance", async () => {
		// Arrange
		const cause = new SpeakerCatalogHistoryError();
		cause.message = "PRIVATE private@example.test git history failed";
		boundary.synchronize.mockRejectedValue(
			new SpeakerSynchronizationError("read-catalog", cause),
		);

		// Act
		await new GithubActionsComposition()
			.actionRunner()
			.run(
				"action.referential.sync-speakers",
				subject().run.bind(subject()),
				false,
			);

		// Assert
		expect(core.setFailed).toHaveBeenCalledOnce();
		expect(boundary.setOutput.mock.calls.map(([name]) => name)).toEqual([
			"pr-body",
		]);
		expect(boundary.setOutput).toHaveBeenCalledWith(
			"pr-body",
			expect.stringContaining("complete repository history (fetch-depth: 0)"),
		);
		expect(JSON.stringify(boundary.setOutput.mock.calls)).not.toMatch(
			/CFP|PRIVATE|private@example.test/,
		);
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
			await new GithubActionsComposition()
				.actionRunner()
				.run(
					"action.referential.sync-speakers",
					subject().run.bind(subject()),
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

function subject() {
	return new SpeakerSyncAction({
		conferenceHallInput: new GithubActionsComposition().conferenceHallInput(),
		automationConfigFactory: { createAutomationConfig: boundary.config },
		speakerSyncFailureReport:
			new GithubActionsComposition().speakerSyncFailureReport(),
		createActionMessages: (...args) =>
			new GithubActionsComposition().actionMessages(...args),
		createSynchronizeSourceSpeakers: (...args) => {
			boundary.createSynchronizer(...args);
			return { execute: boundary.synchronize };
		},
		createConferenceHallProposalSource: (...args) =>
			new ConferenceHallProposalSourceComposition().conferenceHallProposalSource(
				...args,
			),
		createCsvSpeakerCatalogStore: (...args) =>
			new CsvReferentialRepositoryComposition().csvSpeakerCatalogStore(...args),
		createYamlIssueFormProjection: (...args) =>
			new YamlIssueFormProjectionComposition().yamlIssueFormProjection(...args),
	});
}
