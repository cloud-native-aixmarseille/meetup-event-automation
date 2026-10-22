import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GithubActionsComposition } from "./dependency-composition.js";
import { SlidesPdfAction } from "./slides-pdf-action.js";
import { SlidesPdfInput } from "./slides-pdf-input.js";

const mocks = vi.hoisted(() => ({
	setSecret: vi.fn(),
	create: vi.fn(),
	execute: vi.fn(),
	getOctokit: vi.fn(),
}));
vi.mock("@actions/core", async (original) => ({
	...(await original<typeof import("@actions/core")>()),
	setSecret: mocks.setSecret,
}));
vi.mock("@actions/github", () => ({
	context: { repo: { owner: "example", repo: "meetups" } },
	getOctokit: mocks.getOctokit,
}));
const source = {
	revision: "a".repeat(64),
	protectedFolderIds: ["private", "templates"],
	container: {
		id: "event-folder",
		name: "Event",
		url: "https://example.test/event",
		eventId: "example/meetups#12",
	},
	presentation: { id: "slides", name: "Slides", templateId: "template" },
};
beforeEach(() => {
	vi.clearAllMocks();
	for (const [name, value] of Object.entries({
		"issue-number": "12",
		"github-token": "test-token",
		"google-credentials": "test-credentials",
		"google-drive-public-folder-id": "public",
		"slides-ready": "true",
		"pdf-source": JSON.stringify(source),
	}))
		vi.stubEnv(`INPUT_${name.toUpperCase()}`, value);
	mocks.create.mockReturnValue({ execute: mocks.execute });
	mocks.execute.mockResolvedValue({
		status: "ready",
		updated: true,
		diagnostics: [],
	});
});
afterEach(() => vi.unstubAllEnvs());
function subject() {
	return new SlidesPdfAction({
		input: new SlidesPdfInput(),
		runtime: new GithubActionsComposition().runtimeInput(),
		create: mocks.create,
	});
}
describe("PDF action boundary", () => {
	it.each(["private", "templates", "event-folder"])(
		"rejects the protected destination %s before provider access",
		async (destination) => {
			// Arrange
			vi.stubEnv("INPUT_GOOGLE-DRIVE-PUBLIC-FOLDER-ID", destination);
			// Act
			const operation = subject().run(
				new GithubActionsComposition().actionMessages("en"),
			);
			// Assert
			await expect(operation).rejects.toThrow("must differ");
			expect(mocks.create).not.toHaveBeenCalled();
			expect(mocks.getOctokit).not.toHaveBeenCalled();
		},
	);
	it.each([
		"pdf-source",
		"slides-ready",
		"google-credentials",
		"google-drive-public-folder-id",
		"github-token",
		"issue-number",
	])("requires %s before effects", async (name) => {
		// Arrange
		vi.stubEnv(`INPUT_${name.toUpperCase()}`, "");
		// Act
		const operation = subject().run(
			new GithubActionsComposition().actionMessages("en"),
		);
		// Assert
		await expect(operation).rejects.toThrow();
		expect(mocks.execute).not.toHaveBeenCalled();
	});
	it("masks credentials and passes the prepared public source to export", async () => {
		// Arrange
		const action = subject();
		// Act
		const report = await action.run(
			new GithubActionsComposition().actionMessages("en"),
		);
		// Assert
		expect(mocks.execute).toHaveBeenCalledWith(
			{ repository: "example/meetups", issueNumber: 12 },
			source,
			true,
		);
		expect(mocks.setSecret).toHaveBeenCalledWith("test-credentials");
		expect(report.diagnostics).toEqual([]);
		expect(JSON.stringify(report)).not.toContain("test-credentials");
	});
});
