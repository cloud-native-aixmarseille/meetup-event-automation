import * as core from "@actions/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GithubActionsComposition } from "./dependency-composition.js";
import { IssueFormAction } from "./issue-form-action.js";

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

describe("issue form projection", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		boundary.getInput.mockImplementation((name: string) =>
			name === "mode" ? "fix" : "en",
		);
	});
	it("publishes deterministic issue-form projection outputs", async () => {
		// Arrange
		boundary.synchronize.mockResolvedValue({
			changed: true,
			completed: true,
			changedFiles: [".github/ISSUE_TEMPLATE/meetup.yml"],
			diagnostics: [],
		});

		// Act
		const report = await subject().run(
			new GithubActionsComposition().actionMessages("en"),
		);

		// Assert
		expect(report.details).toContain("issue_form=updated");
		expect(report.details).toContain("files=.github/ISSUE_TEMPLATE/meetup.yml");
		expect(core.setOutput).toHaveBeenCalledTimes(2);
		expect(boundary.synchronize).toHaveBeenCalledWith({
			mode: "fix",
		});
		expect(core.setOutput).toHaveBeenCalledWith("changed", "true");

		expect(report.diagnostics).toEqual([]);
		expect(report.failure).toBeUndefined();
	});
});
describe("issue form reporting", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});
	it.each([
		{
			mode: "check",
			changed: true,
			completed: true,
			code: "issue-form.out-of-date",
			severity: "warning",
			fails: false,
		},
		{
			mode: "check",
			changed: false,
			completed: true,
			code: "referential.speaker.id.invalid",
			severity: "error",
			fails: false,
		},
		{
			mode: "fix",
			changed: false,
			completed: true,
			code: "referential.speaker.id.invalid",
			severity: "error",
			fails: false,
		},
		{
			mode: "fix",
			changed: false,
			completed: true,
			code: "unexpected.storage-failure",
			severity: "error",
			fails: true,
		},
	])(
		"classifies $code in $mode mode",
		async ({ mode, changed, completed, code, severity, fails }) => {
			// Arrange
			const inputs: Record<string, string> = { mode, locale: "en" };
			boundary.getInput.mockImplementation(
				(name: string) => inputs[name] ?? "",
			);
			boundary.synchronize.mockResolvedValue({
				changed,
				completed,
				changedFiles: changed ? [".github/ISSUE_TEMPLATE/example.yml"] : [],
				diagnostics: [{ code, severity, message: "Public diagnostic." }],
			});

			// Act
			await new GithubActionsComposition()
				.actionRunner()
				.run(
					"action.issue-form.reconcile",
					subject().run.bind(subject()),
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
		await new GithubActionsComposition()
			.actionRunner()
			.run("action.issue-form.reconcile", subject().run.bind(subject()), false);

		// Assert
		expect(core.setFailed).toHaveBeenCalledOnce();

		expect(core.summary.write).toHaveBeenCalledOnce();
	});
});
function subject() {
	const composition = new GithubActionsComposition();
	return new IssueFormAction({
		reconcileIssueForm: () => ({ execute: boundary.synchronize }),
		referentialActionReport: composition.referentialActionReport(),
		runtimeInput: composition.runtimeInput(),
	});
}
