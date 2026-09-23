import * as core from "@actions/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
}));

vi.mock(
	"../../../application/journey/src/index.js",
	async (importOriginal) => ({
		...(await importOriginal<
			typeof import("../../../application/journey/src/index.js")
		>()),
		ResultEnvelopeFactory: {
			resultEnvelope: (data: unknown, diagnostics: unknown) => ({
				schemaVersion: 1,
				data,
				diagnostics,
			}),
		},
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
			name === "mode" ? "fix" : "",
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
		expect(core.setOutput).toHaveBeenCalledWith("is-valid", "true");
		expect(core.setOutput).toHaveBeenCalledWith("host-count", "1");
		expect(core.setOutput).toHaveBeenCalledWith("speaker-count", "1");
		expect(report.diagnostics).toEqual([]);
		expect(core.setOutput).toHaveBeenCalledWith(
			"result",
			JSON.stringify({
				schemaVersion: 1,
				data: { isValid: true, hostCount: 1, speakerCount: 1 },
				diagnostics: [],
			}),
		);
	});

	it("uses zero public counts for an invalid private catalog", async () => {
		// Arrange
		boundary.validate.mockResolvedValue({
			isValid: false,
			diagnostics: [
				{
					code: "referential.invalid",
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
				code: "referential.invalid",
				severity: "error",
				message: "Invalid row",
			},
		]);
		expect(report.details).toContain("Referentials: invalid.");
		expect(core.setOutput).toHaveBeenCalledWith("is-valid", "false");
		expect(core.setOutput).toHaveBeenCalledWith("host-count", "0");
		expect(core.setOutput).toHaveBeenCalledWith("speaker-count", "0");
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
		expect(report.details).toContain("Issue form was updated.");
		expect(boundary.synchronize).toHaveBeenCalledWith({
			mode: "fix",
		});
		expect(core.setOutput).toHaveBeenCalledWith("changed", "true");
		expect(core.setOutput).toHaveBeenCalledWith(
			"changed-files",
			'[".github/ISSUE_TEMPLATE/meetup.yml"]',
		);
		expect(report.diagnostics).toEqual([]);
	});
});
