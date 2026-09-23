import { beforeEach, describe, expect, it, vi } from "vitest";
import { FeedbackAction } from "./feedback-action.js";

const mocks = vi.hoisted(() => ({
	inputs: {} as Record<string, string>,
	outputs: {} as Record<string, string>,
	setSecret: vi.fn(),
	getOctokit: vi.fn(),
	compose: vi.fn(),
	execute: vi.fn(),
}));
vi.mock("@actions/core", () => ({
	getInput: (name: string, options?: { required?: boolean }) => {
		const value = mocks.inputs[name] ?? "";
		if (options?.required && !value)
			throw new Error(`Input required and not supplied: ${name}`);
		return value.trim();
	},
	setOutput: (name: string, value: string) => {
		mocks.outputs[name] = value;
	},
	setSecret: mocks.setSecret,
}));
vi.mock("@actions/github", () => ({
	context: { repo: { owner: "example", repo: "meetups" } },
	getOctokit: mocks.getOctokit,
}));
vi.mock("./feedback-composition.js", () => ({
	FeedbackComposition: { createFeedbackContainer: mocks.compose },
}));

beforeEach(() => {
	vi.clearAllMocks();
	mocks.inputs = {
		"issue-number": "12",
		mode: "check",
		"github-token": "synthetic-token",
		"managed-comment-author": "example[bot]",
		"kutt-api-key": "synthetic-key",
		"kutt-link-id": "link-1",
	};
	mocks.outputs = {};
	mocks.compose.mockReturnValue({ get: () => ({ execute: mocks.execute }) });
	mocks.execute.mockResolvedValue({
		skipped: false,
		persisted: true,
		feedbackUrl: "https://openfeedback.io/poll",
		linkUpdated: true,
		diagnostics: [],
	});
});

describe("feedback action boundary", () => {
	it.each([
		["kutt-api-key", ""],
		["kutt-api-key", "   "],
		["kutt-link-id", ""],
		["kutt-link-id", "   "],
	])(
		"rejects missing or blank %s (%j) before requests",
		async (name, value) => {
			// Arrange
			mocks.inputs[name] = value;

			// Act
			const operation = FeedbackAction.run();

			// Assert
			await expect(operation).rejects.toThrow(
				`Input required and not supplied: ${name}`,
			);
			expect(mocks.getOctokit).not.toHaveBeenCalled();
			expect(mocks.compose).not.toHaveBeenCalled();
			expect(mocks.outputs).toEqual({});
		},
	);

	it.each(["check", "fix"])(
		"masks credentials and passes explicit %s mode",
		async (mode) => {
			// Arrange
			Object.assign(mocks.inputs, {
				mode,
				"kutt-api-key": "synthetic-key",
				"kutt-link-id": "link-1",
			});

			// Act
			await FeedbackAction.run();

			// Assert
			expect(mocks.setSecret).toHaveBeenCalledWith("synthetic-key");
			expect(mocks.execute).toHaveBeenCalledWith({
				identity: { repository: "example/meetups", issueNumber: 12 },
				mode,
			});
			expect(mocks.outputs["feedback-url"]).toBe(
				"https://openfeedback.io/poll",
			);
			expect(mocks.outputs["link-updated"]).toBe("true");
			expect(JSON.stringify(mocks.outputs)).not.toContain("synthetic-");
		},
	);

	it("forwards both required Kutt settings", async () => {
		// Arrange
		// Default inputs provide both required Kutt settings.

		// Act
		await FeedbackAction.run();

		// Assert
		expect(mocks.compose).toHaveBeenCalledWith(
			expect.objectContaining({
				kuttApiKey: "synthetic-key",
				kuttLinkId: "link-1",
			}),
		);
	});
});
