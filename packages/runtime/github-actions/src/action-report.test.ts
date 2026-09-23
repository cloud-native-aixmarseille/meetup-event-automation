import * as core from "@actions/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionReport } from "./action-report.js";

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
		"publishes %s diagnostics with their code, field, and message",
		async (severity) => {
			// Arrange
			const diagnostics = [
				{
					code: "example.invalid",
					severity,
					field: "records[2].id",
					message: "Identifiers must be unique.",
				},
			];
			const annotation = {
				error: core.error,
				warning: core.warning,
				info: core.notice,
			}[severity];

			// Act
			await ActionReport.write("Example action", {
				details: ["Validation completed."],
				diagnostics,
			});

			// Assert
			expect(annotation).toHaveBeenCalledWith(
				"[example.invalid] (records[2].id): Identifiers must be unique.",
			);
			expect(core.info).toHaveBeenCalledWith("Validation completed.");
			expect(core.summary.addHeading).toHaveBeenCalledWith("Example action", 2);
			expect(core.summary.addRaw).toHaveBeenCalledWith(
				expect.stringContaining("records[2].id"),
			);
			expect(core.summary.addRaw).toHaveBeenCalledWith(
				expect.stringContaining("Identifiers must be unique."),
			);
			expect(core.summary.write).toHaveBeenCalledOnce();
		},
	);

	it("reports successful operations even when no diagnostics exist", async () => {
		// Arrange
		const report = { details: ["Active events: 0."], diagnostics: [] };

		// Act
		await ActionReport.write("Example action", report);

		// Assert
		expect(core.info).toHaveBeenCalledWith("No diagnostics.");
		expect(core.summary.addRaw).toHaveBeenCalledWith(
			expect.stringContaining("Active events: 0.\nNo diagnostics."),
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
			await ActionReport.write("Example action", { details: [], diagnostics });

			// Assert
			expect(core.notice).toHaveBeenCalledWith(
				expect.stringContaining(String(fixApplied)),
			);
			expect(core.summary.addRaw).toHaveBeenCalledWith(
				expect.stringContaining("fix applied:"),
			);
		},
	);

	it("escapes summary content and keeps multiline details from becoming workflow commands", async () => {
		// Arrange
		const report = {
			details: ["File: <example>&.yml\r\n::error::injected"],
			diagnostics: [
				{
					code: "example.warning",
					severity: "warning" as const,
					message: "</pre><b>Example & text</b>",
				},
			],
		};

		// Act
		await ActionReport.write("Example action", report);

		// Assert
		expect(core.info).toHaveBeenCalledWith(
			"File: <example>&.yml\\r\\n::error::injected",
		);
		expect(core.summary.addRaw).toHaveBeenCalledWith(
			expect.stringContaining("&lt;example&gt;&amp;.yml"),
		);
		expect(core.summary.addRaw).toHaveBeenCalledWith(
			expect.stringContaining(
				"&lt;/pre&gt;&lt;b&gt;Example &amp; text&lt;/b&gt;",
			),
		);
	});

	it("prints only selected report fields, not arbitrary diagnostic metadata", async () => {
		// Arrange
		const report = {
			details: ["Delivery deferred."],
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
		await ActionReport.write("Example action", report);

		// Assert
		expect(
			JSON.stringify([
				vi.mocked(core.info).mock.calls,
				vi.mocked(core.notice).mock.calls,
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
			details: ["Validation completed."],
			diagnostics: [
				{
					code: "example.invalid",
					severity: "error" as const,
					message: "Correct the catalog.",
				},
			],
		};

		// Act
		await ActionReport.write("Example action", report);

		// Assert
		expect(core.error).toHaveBeenCalledWith(
			"[example.invalid]: Correct the catalog.",
		);
		expect(core.warning).toHaveBeenCalledWith(
			"The job summary could not be written; the action report is available in the logs and annotations.",
		);
		expect(core.summary.clear).toHaveBeenCalledOnce();
		expect(JSON.stringify(vi.mocked(core.warning).mock.calls)).not.toContain(
			"private summary failure",
		);
	});
});
