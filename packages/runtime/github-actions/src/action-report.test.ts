import * as core from "@actions/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionReport } from "./action-report.js";
import { GithubActionsComposition } from "./dependency-composition.js";

vi.mock("@actions/core", () => ({
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

describe("shared action reporting", () => {
	beforeEach(() => vi.clearAllMocks());

	it.each(["error", "warning", "info"] as const)(
		"logs technical %s diagnostics without organizer prose or annotations",
		async (severity) => {
			// Arrange
			const diagnostics = [
				{
					code: "example.invalid",
					severity,
					field: "records[2].id",
					message: "Correct the duplicate identifier before retrying.",
				},
			];

			// Act
			await new ActionReport().write(
				"Example action",
				{
					details: ["validation=completed"],
					diagnostics,
				},
				new GithubActionsComposition().actionMessages("en"),
			);

			// Assert
			expect(core.info).toHaveBeenCalledWith(
				`${severity} example.invalid field=records[2].id`,
			);
			expect(core.summary.addHeading).toHaveBeenCalledWith("Example action", 2);
			expect(core.summary.addRaw).toHaveBeenCalledWith(
				`<pre>validation=completed\n${severity} example.invalid field=records[2].id</pre>\n`,
			);
			expect(core.error).not.toHaveBeenCalled();
			expect(core.warning).not.toHaveBeenCalled();
			expect(core.notice).not.toHaveBeenCalled();
			expect(core.summary.write).toHaveBeenCalledOnce();
		},
	);

	it("reports successful operations without empty-diagnostic boilerplate", async () => {
		// Arrange
		const report = { details: ["active_events=0"], diagnostics: [] };

		// Act
		await new ActionReport().write(
			"Example action",
			report,
			new GithubActionsComposition().actionMessages("en"),
		);

		// Assert
		expect(core.info).toHaveBeenCalledExactlyOnceWith("active_events=0");
		expect(core.summary.addRaw).toHaveBeenCalledWith(
			"<pre>active_events=0</pre>\n",
		);
		expect(core.error).not.toHaveBeenCalled();
	});

	it.each([true, false])(
		"includes the fix-applied flag when it is %s",
		async (fixApplied) => {
			// Arrange
			const diagnostics = [
				{
					code: "example.normalized",
					severity: "info" as const,
					message: "Normalization evaluated.",
					fixApplied,
				},
			];

			// Act
			await new ActionReport().write(
				"Example action",
				{ details: [], diagnostics },
				new GithubActionsComposition().actionMessages("en"),
			);

			// Assert
			expect(core.info).toHaveBeenCalledExactlyOnceWith(
				`info example.normalized fix_applied=${fixApplied}`,
			);
			expect(core.summary.addRaw).toHaveBeenCalledWith(
				expect.stringContaining(`fix_applied=${fixApplied}`),
			);
		},
	);

	it("deduplicates identical facts and diagnostic locations", async () => {
		// Arrange
		const diagnostic = {
			code: "example.invalid",
			severity: "error" as const,
			field: "records[2].id",
			message: "Correct the identifier.",
		};

		// Act
		await new ActionReport().write(
			"Example action",
			{
				details: ["validation=completed", "validation=completed"],
				diagnostics: [
					diagnostic,
					diagnostic,
					{ ...diagnostic, field: "records[3].id" },
				],
			},
			new GithubActionsComposition().actionMessages("en"),
		);

		// Assert
		expect(core.info).toHaveBeenCalledTimes(3);
		expect(core.summary.addRaw).toHaveBeenCalledWith(
			"<pre>validation=completed\nerror example.invalid field=records[2].id\nerror example.invalid field=records[3].id</pre>\n",
		);
	});

	it("escapes summary content and keeps multiline fields from becoming workflow commands", async () => {
		// Arrange
		const report = {
			details: ["file=<example>&.yml\r\n::error::injected"],
			diagnostics: [
				{
					code: "example.warning",
					severity: "warning" as const,
					field: "</pre><b>text</b>\n::error::injected",
					message: "Correct the identifier.",
				},
			],
		};

		// Act
		await new ActionReport().write(
			"Example action",
			report,
			new GithubActionsComposition().actionMessages("en"),
		);

		// Assert
		expect(core.info).toHaveBeenCalledWith(
			"file=<example>&.yml\\r\\n::error::injected",
		);
		expect(core.info).toHaveBeenCalledWith(
			"warning example.warning field=</pre><b>text</b>\\n::error::injected",
		);
		expect(core.summary.addRaw).toHaveBeenCalledWith(
			expect.stringContaining("&lt;example&gt;&amp;.yml"),
		);
		expect(core.summary.addRaw).toHaveBeenCalledWith(
			expect.stringContaining("&lt;/pre&gt;&lt;b&gt;text&lt;/b&gt;"),
		);
	});

	it("prints only selected report fields, not arbitrary diagnostic metadata", async () => {
		// Arrange
		const report = {
			details: ["delivery=deferred"],
			privateData: "private@example.test",
			diagnostics: [
				{
					code: "example.deferred",
					severity: "info" as const,
					message: "Retry later.",
					destination: "private@example.test",
				},
			],
		};

		// Act
		await new ActionReport().write(
			"Example action",
			report,
			new GithubActionsComposition().actionMessages("en"),
		);

		// Assert
		expect(
			JSON.stringify([
				vi.mocked(core.info).mock.calls,
				vi.mocked(core.summary.addRaw).mock.calls,
			]),
		).not.toContain("private@example.test");
	});

	it("keeps diagnostics visible if the summary cannot be written", async () => {
		// Arrange
		vi.mocked(core.summary.write).mockRejectedValueOnce(
			new Error("private summary failure"),
		);
		const report = {
			details: ["validation=completed"],
			diagnostics: [
				{
					code: "example.invalid",
					severity: "error" as const,
					message: "Correct the catalog.",
				},
			],
		};

		// Act
		await new ActionReport().write(
			"Example action",
			report,
			new GithubActionsComposition().actionMessages("en"),
		);

		// Assert
		expect(core.info).toHaveBeenCalledWith("error example.invalid");
		expect(core.warning).toHaveBeenCalledExactlyOnceWith("summary=unavailable");
		expect(core.summary.clear).toHaveBeenCalledOnce();
	});
});
