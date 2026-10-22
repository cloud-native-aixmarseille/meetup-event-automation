import type { ManageMeetupAssets } from "@meetup-automation/journey";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { publicationUrlInputs } from "../testing/publication-urls.fixtures.js";
import { GithubActionsComposition } from "./dependency-composition.js";
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

beforeEach(() => {
	vi.clearAllMocks();
	for (const [name, value] of Object.entries({
		...publicationUrlInputs,
		"conference-hall-event": "example-cfp",
		"conference-hall-api-key": "synthetic-source-key",
		"issue-number": "42",
		"github-token": "github-test-token",
		"google-credentials": "secret-json",
		"google-drive-folder-id": "parent",
		"google-drive-public-folder-id": "public-folder",
		"google-drive-template-folder-id": "templates",
	})) {
		vi.stubEnv(`INPUT_${name.toUpperCase()}`, value);
	}
	mocks.outputs = {};
	mocks.createAssets.mockReturnValue({ execute: mocks.execute });
	mocks.execute.mockResolvedValue({
		pdf: { status: "ready", updated: false, diagnostics: [] },
		skipped: false,
		persisted: false,
		slidesReady: true,
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
			pdf: { status: "ready", updated: false, diagnostics: [] },
			skipped: false,
			persisted: false,
			files: { "slides-link": url },
			content: { slides: "conflict" },
			slidesReady: false,
			diagnostics: [],
		});

		// Act
		await subject().runPublicationReconcileAssetsAction(
			new GithubActionsComposition().actionMessages("en"),
		);

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
		"meetup-event-url-prefix",
		"community-event-url-prefixes",
		"asset-folder-url-prefix",
		"conference-hall-event",
		"conference-hall-api-key",
		"google-credentials",
		"google-drive-folder-id",
		"google-drive-public-folder-id",
		"google-drive-template-folder-id",
	])("requires %s before reconciling", async (input) => {
		// Arrange
		vi.stubEnv(`INPUT_${input.toUpperCase()}`, "");

		// Act
		const operation = subject().runPublicationReconcileAssetsAction(
			new GithubActionsComposition().actionMessages("en"),
		);

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
		const report = await subject().runPublicationReconcileAssetsAction(
			new GithubActionsComposition().actionMessages("en"),
		);
		const actual = JSON.parse(mocks.outputs["drive-files"]);
		const actual1 = JSON.stringify(mocks.outputs);

		// Assert
		expect(mocks.setSecret).toHaveBeenCalledWith("secret-json");
		expect(mocks.createAssets).toHaveBeenCalledWith(
			expect.objectContaining({
				credentials: "secret-json",
				parentFolderId: "parent",
				publicFolderId: "public-folder",
				templateFolderId: "templates",
			}),
		);
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
			pdf: { status: "not-applicable", updated: false, diagnostics: [] },
			skipped: true,
			persisted: false,
			slidesReady: false,
			files: {},
			diagnostics: [],
		});

		// Act
		const report = await subject().runPublicationReconcileAssetsAction(
			new GithubActionsComposition().actionMessages("en"),
		);

		// Assert
		expect(mocks.createAssets).toHaveBeenCalledWith(
			expect.objectContaining({
				credentials: "secret-json",
				parentFolderId: "parent",
				publicFolderId: "public-folder",
				templateFolderId: "templates",
			}),
		);
		expect(mocks.outputs["slides-ready"]).toBe(false);
		expect(report.details.join("\n")).toContain("assets=skipped");
	});
});

function subject() {
	const composition = new GithubActionsComposition();
	return new PublicationAction({
		publicationUrlInput: new GithubActionsComposition().publicationUrlInput(),
		createJourney: mocks.createAssets,
		runtimeInput: composition.runtimeInput(),
		assetContentConfiguration: composition.assetContentConfiguration(),
		conferenceHallInput: composition.conferenceHallInput(),
		actionOutput: composition.actionOutput(),
	});
}
