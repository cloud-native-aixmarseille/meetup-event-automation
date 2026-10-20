import * as core from "@actions/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionRunner } from "./action-runner.js";
import { ReferentialActions } from "./referential-actions.js";

const boundary = vi.hoisted(() => ({
	getInput: vi.fn(),
	setOutput: vi.fn(),
	validate: vi.fn(),
	synchronize: vi.fn(),
}));

vi.mock("@actions/core", () => ({
	getInput: boundary.getInput,
	setOutput: boundary.setOutput,
	setFailed: vi.fn(),
	info: vi.fn(),
	error: vi.fn(),
	warning: vi.fn(),
	notice: vi.fn(),
	summary: {
		addHeading: vi.fn().mockReturnThis(),
		addRaw: vi.fn().mockReturnThis(),
		write: vi.fn().mockResolvedValue(undefined),
		clear: vi.fn().mockReturnThis(),
	},
}));

vi.mock(
	"../../../application/journey/src/index.js",
	async (importOriginal) => ({
		...(await importOriginal<
			typeof import("../../../application/journey/src/index.js")
		>()),
		ValidateMeetupReferentials: class {
			execute = boundary.validate;
		},
		SynchronizeMeetupIssueForm: class {
			execute = boundary.synchronize;
		},
	}),
);

vi.mock("../../../adapter/yaml-issue-form-projection/src/index.js", () => ({
	YamlIssueFormProjection: class {},
}));

describe("referential GitHub Action boundary", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		boundary.getInput.mockImplementation((name: string) =>
			name === "mode" ? "fix" : "en",
		);
	});

	it("publishes redacted catalog validation counts", async () => {
		// Arrange
		boundary.validate.mockResolvedValue({
			isValid: true,
			catalog: {
				hosts: [{ id: "host-9001" }],
				speakers: [{ id: "speaker-9001" }],
			},
			diagnostics: [],
		});

		// Act
		const report = await ReferentialActions.runReferentialValidateAction();

		// Assert

		expect(report.diagnostics).toEqual([]);
		expect(report.details).toContain("hosts=1 speakers=1");
		expect(core.setOutput).not.toHaveBeenCalled();
		expect(report.failure).toBeUndefined();
	});

	it("uses zero public counts for an invalid private catalog", async () => {
		// Arrange
		boundary.validate.mockResolvedValue({
			isValid: false,
			diagnostics: [
				{
					code: "referential.speaker.id.invalid",
					severity: "error",
					message: "Invalid row",
				},
			],
		});

		// Act
		const report = await ReferentialActions.runReferentialValidateAction();

		// Assert
		expect(report.diagnostics).toEqual([
			{
				code: "referential.speaker.id.invalid",
				severity: "error",
				message: "Invalid row",
			},
		]);
		expect(report.details).toContain("referentials=invalid");
		expect(report.details).toContain("hosts=0 speakers=0");
		expect(core.setOutput).not.toHaveBeenCalled();
		expect(report.failure).toBeUndefined();
	});

	it("publishes deterministic issue-form projection outputs", async () => {
		// Arrange
		boundary.synchronize.mockResolvedValue({
			changed: true,
			changedFiles: [".github/ISSUE_TEMPLATE/meetup.yml"],
			diagnostics: [],
		});

		// Act
		const report = await ReferentialActions.runReferentialSyncIssueFormAction();

		// Assert
		expect(report.details).toContain("issue_form=updated");
		expect(report.details).toContain("files=.github/ISSUE_TEMPLATE/meetup.yml");
		expect(core.setOutput).toHaveBeenCalledTimes(1);
		expect(boundary.synchronize).toHaveBeenCalledWith({
			mode: "fix",
		});
		expect(core.setOutput).toHaveBeenCalledWith("changed", "true");

		expect(report.diagnostics).toEqual([]);
		expect(report.failure).toBeUndefined();
	});
});

describe("referential action failure reporting", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it.each(["en", "fr"])(
		"reports invalid catalog data without failing in %s",
		async (locale) => {
			// Arrange
			boundary.getInput.mockImplementation((name: string) =>
				name === "locale" ? locale : "",
			);
			boundary.validate.mockResolvedValue({
				isValid: false,
				diagnostics: [
					{
						code: "referential.speaker.id.invalid",
						severity: "error",
						message: "Invalid stable identifier.",
					},
				],
			});

			// Act
			await ActionRunner.run(
				"action.referential.validate",
				ReferentialActions.runReferentialValidateAction,
				false,
			);

			// Assert
			expect(core.setFailed).not.toHaveBeenCalled();
			expect(core.info).toHaveBeenCalledWith(
				"error referential.speaker.id.invalid",
			);
			expect(core.error).not.toHaveBeenCalled();
			expect(core.summary.write).toHaveBeenCalledOnce();
		},
	);

	it.each([
		{
			mode: "check",
			changed: true,
			code: "issue-form.out-of-date",
			severity: "warning",
			fails: false,
		},
		{
			mode: "check",
			changed: false,
			code: "referential.speaker.id.invalid",
			severity: "error",
			fails: false,
		},
		{
			mode: "fix",
			changed: false,
			code: "referential.speaker.id.invalid",
			severity: "error",
			fails: false,
		},
		{
			mode: "fix",
			changed: false,
			code: "unexpected.storage-failure",
			severity: "error",
			fails: true,
		},
	])(
		"classifies $code in $mode mode",
		async ({ mode, changed, code, severity, fails }) => {
			// Arrange
			const inputs: Record<string, string> = { mode, locale: "en" };
			boundary.getInput.mockImplementation(
				(name: string) => inputs[name] ?? "",
			);
			boundary.synchronize.mockResolvedValue({
				changed,
				changedFiles: changed ? [".github/ISSUE_TEMPLATE/example.yml"] : [],
				diagnostics: [{ code, severity, message: "Public diagnostic." }],
			});

			// Act
			await ActionRunner.run(
				"action.referential.sync-issue-form",
				ReferentialActions.runReferentialSyncIssueFormAction,
				false,
			);

			// Assert
			expect(core.setFailed).toHaveBeenCalledTimes(fails ? 1 : 0);
			expect(boundary.synchronize).toHaveBeenCalledWith({ mode });
			expect(core.setOutput).toHaveBeenCalledWith("changed", String(changed));
			expect(core.summary.write).toHaveBeenCalledOnce();
		},
	);

	it("fails projection errors even when drift is allowed", async () => {
		// Arrange
		const inputs: Record<string, string> = {
			mode: "check",
			locale: "en",
		};
		boundary.getInput.mockImplementation((name: string) => inputs[name] ?? "");
		boundary.synchronize.mockRejectedValue(
			new Error("Issue form is not valid YAML."),
		);

		// Act
		await ActionRunner.run(
			"action.referential.sync-issue-form",
			ReferentialActions.runReferentialSyncIssueFormAction,
			false,
		);

		// Assert
		expect(core.setFailed).toHaveBeenCalledOnce();

		expect(core.summary.write).toHaveBeenCalledOnce();
	});
});
