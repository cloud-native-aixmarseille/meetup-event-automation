import type { ManageMeetupAssets } from "@meetup-automation/journey";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PublicationAction } from "./publication-action.js";

const mocks = vi.hoisted(() => ({
	outputs: {} as Record<string, string>,
	setSecret: vi.fn(),
	createAssets: vi.fn(),
	execute: vi.fn(),
	dependencies: undefined as
		| ConstructorParameters<typeof ManageMeetupAssets>[0]
		| undefined,
}));

vi.mock("@actions/core", async (importOriginal) => ({
	...(await importOriginal<typeof import("@actions/core")>()),
	setOutput: (name: string, value: string) => {
		mocks.outputs[name] = value;
	},
	setSecret: mocks.setSecret,
}));

vi.mock("@actions/github", () => ({
	context: { repo: { owner: "community", repo: "meetups" } },
	getOctokit: () => ({}),
}));

vi.mock(
	"@meetup-automation/google-drive-asset-repository",
	async (importOriginal) => ({
		...(await importOriginal<
			typeof import("@meetup-automation/google-drive-asset-repository")
		>()),
		GoogleDriveAuthentication: { create: vi.fn(() => undefined) },
		GoogleDriveAssetRepository: {
			createGoogleDriveAssetRepository: mocks.createAssets,
			client: vi.fn(() => ({ files: {} })),
		},
	}),
);

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
	for (const [name, value] of Object.entries({
		"conference-hall-event": "example-cfp",
		"conference-hall-api-key": "synthetic-source-key",
		"issue-number": "42",
		"github-token": "github-test-token",
		"google-credentials": "secret-json",
		"google-drive-meetup-folder-id": "parent",
		"google-drive-meetup-template-folder-id": "templates",
	})) {
		vi.stubEnv(`INPUT_${name.toUpperCase()}`, value);
	}
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

afterEach(() => vi.unstubAllEnvs());

describe("publication action boundary", () => {
	it("retains the stable slides URL while reporting conflicted content as unready", async () => {
		// Arrange
		const url = "https://docs.google.com/presentation/d/stable-slides";
		mocks.execute.mockResolvedValue({
			skipped: false,
			persisted: false,
			files: { "slides-link": url },
			content: { slides: "conflict" },
			diagnostics: [],
		});

		// Act
		await PublicationAction.runPublicationReconcileAssetsAction();

		// Assert
		expect(JSON.parse(mocks.outputs["drive-files"])).toEqual({
			"slides-link": url,
		});
		expect(Object.keys(mocks.outputs).sort()).toEqual([
			"drive-files",
			"slides-ready",
		]);
		expect(mocks.outputs["slides-ready"]).toBe(false);
	});
	it.each([
		"conference-hall-event",
		"conference-hall-api-key",
		"google-credentials",
		"google-drive-meetup-folder-id",
		"google-drive-meetup-template-folder-id",
	])("requires %s before reconciling", async (input) => {
		// Arrange
		vi.stubEnv(`INPUT_${input.toUpperCase()}`, "");

		// Act
		const operation = PublicationAction.runPublicationReconcileAssetsAction();

		// Assert
		await expect(operation).rejects.toThrow(
			`Input required and not supplied: ${input}`,
		);
		expect(mocks.createAssets).not.toHaveBeenCalled();
		expect(mocks.execute).not.toHaveBeenCalled();
		expect(mocks.outputs).toEqual({});
	});

	it("masks credentials and reconciles assets without a mode input", async () => {
		// Arrange
		vi.stubEnv("INPUT_MODE", "");

		// Act
		const report =
			await PublicationAction.runPublicationReconcileAssetsAction();
		const actual = JSON.parse(mocks.outputs["drive-files"]);
		const actual1 = JSON.stringify(mocks.outputs);

		// Assert
		expect(mocks.setSecret).toHaveBeenCalledWith("secret-json");
		expect(mocks.createAssets).toHaveBeenCalledWith("secret-json", {
			parentFolderId: "parent",
			contentContracts: {},
			templateFolderId: "templates",
		});
		expect(mocks.execute).toHaveBeenCalledWith(
			expect.objectContaining({
				identity: { repository: "community/meetups", issueNumber: 42 },
			}),
		);
		expect(actual).toHaveProperty("slides-link");
		expect(report.diagnostics).toEqual([]);
		expect(report.details).toContain("assets=completed");
		expect(actual1).not.toContain("secret-json");
	});

	it("reports skipped events with supplied Google Drive configuration", async () => {
		// Arrange
		mocks.execute.mockResolvedValue({
			skipped: true,
			persisted: false,
			files: {},
			diagnostics: [],
		});

		// Act
		const report =
			await PublicationAction.runPublicationReconcileAssetsAction();

		// Assert
		expect(mocks.createAssets).toHaveBeenCalledWith("secret-json", {
			parentFolderId: "parent",
			contentContracts: {},
			templateFolderId: "templates",
		});
		expect(mocks.outputs["slides-ready"]).toBe(false);
		expect(report.details.join("\n")).toContain("assets=skipped");
	});
});
