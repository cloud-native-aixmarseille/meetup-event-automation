import * as core from "@actions/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GithubActionsComposition } from "./dependency-composition.js";
import { ReferentialAction } from "./referential-action.js";

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

describe("referential validation", () => {
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
		const report = await subject().run(
			new GithubActionsComposition().actionMessages("en"),
		);

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
		const report = await subject().run(
			new GithubActionsComposition().actionMessages("en"),
		);

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
});
describe("referential validation reporting", () => {
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
			await new GithubActionsComposition()
				.actionRunner()
				.run(
					"action.referential.validate",
					subject().run.bind(subject()),
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
});
function subject() {
	const composition = new GithubActionsComposition();
	return new ReferentialAction({
		validateReferentials: () => ({ execute: boundary.validate }),
		referentialActionReport: composition.referentialActionReport(),
	});
}
