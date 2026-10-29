import * as core from "@actions/core";
import type { ManageContentReview } from "@meetup-automation/journey";
import { LocalizationComposition } from "@meetup-automation/localization";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	draftInputs,
	draftSourceFixture,
} from "../testing/draft-source.fixtures.js";
import { ActionMessages } from "./i18n/action-messages.js";
import { ReviewDraftsAction } from "./review-drafts-action.js";

vi.mock("@actions/core", () => ({ getInput: vi.fn(), setSecret: vi.fn() }));
vi.mock("@actions/github", async (original) => ({
	...(await original<typeof import("@actions/github")>()),
	context: { repo: { owner: "example", repo: "events" } },
}));
beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(core.getInput).mockImplementation(
		(name) => draftInputs[name] ?? "",
	);
});

function fixture() {
	const f = draftSourceFixture();
	const media = {
		artwork: vi.fn(() => ({
			credentials: "synthetic-credentials",
			publicFolderId: "public-folder",
		})),
	};
	const exists = vi.fn(async () => false);
	const work = vi.fn(() => ({ exists }));
	const execute = vi.fn<ManageContentReview["execute"]>().mockResolvedValue([]);
	const compose = vi.fn(() => ({ execute }));
	const messages = new ActionMessages(
		{ localeResolver: new LocalizationComposition().localeResolver() },
		"en",
	);
	return {
		...f,
		media,
		exists,
		work,
		execute,
		compose,
		messages,
		action: new ReviewDraftsAction(f.source, media, work, compose),
	};
}

describe("routine draft review", () => {
	it("reports no work without loading unused configuration or constructing effects", async () => {
		// Arrange
		const f = fixture();
		for (const loader of [f.configuration, f.publication, f.social])
			loader.load.mockRejectedValue(new Error("File does not exist"));
		// Act
		const result = await f.action.run(f.messages);
		// Assert
		expect(result).toEqual({
			details: ["No content proposals or organizer submissions to review."],
			diagnostics: [],
		});
		expect(f.exists).toHaveBeenCalledOnce();
		expect(f.work).toHaveBeenCalledWith(
			expect.objectContaining({
				owner: "example",
				repo: "events",
				issueNumber: 42,
			}),
		);
		for (const loader of [f.configuration, f.publication, f.social])
			expect(loader.load).not.toHaveBeenCalled();
		expect(f.media.artwork).not.toHaveBeenCalled();
		expect(f.compose).not.toHaveBeenCalled();
		expect(core.getInput).not.toHaveBeenCalledWith(
			"slack-token",
			expect.anything(),
		);
	});
	it("preserves review diagnostics when content work exists", async () => {
		// Arrange
		const f = fixture();
		f.exists.mockResolvedValue(true);
		const diagnostics = [
			{
				code: "publication.content.pending",
				severity: "warning" as const,
				message: "Content title: pending",
			},
		];
		f.execute.mockResolvedValue(diagnostics);
		// Act
		const result = await f.action.run(f.messages);
		// Assert
		expect(result).toEqual({
			details: ["Content reviews reconciled."],
			diagnostics,
		});
		for (const loader of [f.configuration, f.publication, f.social])
			expect(loader.load).toHaveBeenCalledExactlyOnceWith(process.cwd());
		expect(f.compose).toHaveBeenCalledWith(
			expect.objectContaining({
				settings: {
					months: {},
					mentions: [],
					reminderTime: "09:00",
					guidance: "",
					announcements: {},
				},
				credentials: "synthetic-credentials",
			}),
			"synthetic-slack-token",
			"CORGANIZERS",
		);
		expect(f.execute).toHaveBeenCalledExactlyOnceWith({
			repository: "example/events",
			issueNumber: 42,
		});
	});
	it("propagates work discovery failures without declaring the content stage complete", async () => {
		// Arrange
		const f = fixture();
		const error = new Error("Issue state could not be verified");
		f.exists.mockRejectedValue(error);
		// Act
		const result = f.action.run(f.messages);
		// Assert
		await expect(result).rejects.toBe(error);
		expect(f.configuration.load).not.toHaveBeenCalled();
		expect(f.compose).not.toHaveBeenCalled();
	});
	it.each(["configuration", "publication", "social"] as const)(
		"requires %s when content work exists",
		async (name) => {
			// Arrange
			const f = fixture();
			f.exists.mockResolvedValue(true);
			const error = new Error("Configuration missing or invalid");
			f[name].load.mockRejectedValue(error);
			// Act
			const result = f.action.run(f.messages);
			// Assert
			await expect(result).rejects.toBe(error);
			expect(f.compose).not.toHaveBeenCalled();
		},
	);
});
