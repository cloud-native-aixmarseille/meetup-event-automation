import type { ManageMeetupAssets } from "@meetup-automation/journey";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicationAction } from "./publication-action.js";

const mocks = vi.hoisted(() => ({
	inputs: {} as Record<string, string>,
	outputs: {} as Record<string, string>,
	setSecret: vi.fn(),
	createAssets: vi.fn(),
	execute: vi.fn(),
	dependencies: undefined as
		| ConstructorParameters<typeof ManageMeetupAssets>[0]
		| undefined,
}));

vi.mock("@actions/core", () => ({
	getInput: (name: string) => mocks.inputs[name] ?? "",
	setOutput: (name: string, value: string) => {
		mocks.outputs[name] = value;
	},
	setSecret: mocks.setSecret,
}));

vi.mock("@actions/github", () => ({
	context: { repo: { owner: "community", repo: "meetups" } },
	getOctokit: () => ({}),
}));

vi.mock("@meetup-automation/google-drive-asset-repository", () => ({
	GoogleDriveAssetRepository: {
		createGoogleDriveAssetRepository: mocks.createAssets,
	},
}));

vi.mock("@meetup-automation/journey", async (importOriginal) => ({
	...(await importOriginal<typeof import("@meetup-automation/journey")>()),
	ManageMeetupAssets: class {
		constructor(
			dependencies: ConstructorParameters<typeof ManageMeetupAssets>[0],
		) {
			mocks.dependencies = dependencies;
		}
		execute = mocks.execute;
	},
}));

beforeEach(() => {
	vi.clearAllMocks();
	vi.unstubAllEnvs();
	mocks.inputs = {
		"issue-number": "42",
		mode: "check",
		"github-token": "github-test-token",
		"managed-comment-author": "test[bot]",
	};
	mocks.outputs = {};
	mocks.createAssets.mockReturnValue({});
	mocks.execute.mockResolvedValue({
		skipped: false,
		persisted: false,
		assetUrl: "https://drive.google.com/drive/folders/folder",
		files: { "slides-link": "https://docs.google.com/presentation/d/slides" },
		diagnostics: [],
	});
});

describe("publication action boundary", () => {
	it("leaves assets manual when the optional credential is absent", async () => {
		// Arrange
		// No additional setup is needed.

		// Act
		await PublicationAction.runPublicationReconcileAssetsAction();
		const actual = JSON.parse(mocks.outputs.result);

		// Assert
		expect(actual).toMatchObject({
			schemaVersion: 1,
			data: { skipped: true, files: {} },
			diagnostics: [{ code: "publication.assets.unavailable" }],
		});
		expect(mocks.outputs["drive-files"]).toBe("{}");
		expect(mocks.outputs["asset-url"]).toBe("");
		expect(mocks.createAssets).not.toHaveBeenCalled();
	});

	it.each(["check", "fix"])(
		"masks credentials and serializes the %s result",
		async (mode) => {
			// Arrange
			Object.assign(mocks.inputs, {
				mode,
				"google-credentials": "secret-json",
			});
			Object.assign(mocks.inputs, {
				"google-drive-meetup-folder-id": "parent",
				"google-drive-meetup-template-folder-id": "templates",
			});

			// Act
			await PublicationAction.runPublicationReconcileAssetsAction();
			const actual = JSON.parse(mocks.outputs["drive-files"]);
			const actual1 = JSON.stringify(mocks.outputs);

			// Assert
			expect(mocks.setSecret).toHaveBeenCalledWith("secret-json");
			expect(mocks.createAssets).toHaveBeenCalledWith("secret-json", {
				parentFolderId: "parent",
				templateFolderId: "templates",
			});
			expect(mocks.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					identity: { repository: "community/meetups", issueNumber: 42 },
					mode,
				}),
			);
			expect(actual).toHaveProperty("slides-link");
			expect(mocks.outputs.diagnostics).toBe("[]");
			expect(actual1).not.toContain("secret-json");
		},
	);

	it("passes missing folder configuration to the validating adapter and handles skipped events", async () => {
		// Arrange
		mocks.inputs["google-credentials"] = "secret-json";
		mocks.execute.mockResolvedValue({
			skipped: true,
			persisted: false,
			files: {},
			diagnostics: [],
		});

		// Act
		await PublicationAction.runPublicationReconcileAssetsAction();

		// Assert
		expect(mocks.createAssets).toHaveBeenCalledWith("secret-json", {
			parentFolderId: "",
			templateFolderId: "",
		});
		expect(mocks.outputs["asset-url"]).toBe("");
	});
});
