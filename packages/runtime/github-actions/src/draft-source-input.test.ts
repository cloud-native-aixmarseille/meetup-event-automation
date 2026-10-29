import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	draftInputs,
	draftSourceFixture,
} from "../testing/draft-source.fixtures.js";

vi.mock("@actions/core", () => ({ getInput: vi.fn(), setSecret: vi.fn() }));
vi.mock("@actions/github", async (original) => ({
	...(await original<typeof import("@actions/github")>()),
	context: { repo: { owner: "example", repo: "events" } },
}));

import * as core from "@actions/core";

beforeEach(() => {
	vi.mocked(core.getInput).mockImplementation(
		(name) => draftInputs[name] ?? "",
	);
});

describe("draft source input", () => {
	it("reads issue context without loading feature configuration", () => {
		// Arrange
		const f = draftSourceFixture();
		// Act
		const result = f.source.readContext("fr");
		// Assert
		expect(result).toMatchObject({
			owner: "example",
			repo: "events",
			issueNumber: 42,
			locale: "fr",
		});
		expect(f.configuration.load).not.toHaveBeenCalled();
		expect(f.publication.load).not.toHaveBeenCalled();
		expect(f.social.load).not.toHaveBeenCalled();
	});
	it("loads all explicit settings for generation and publication callers", async () => {
		// Arrange
		const f = draftSourceFixture();
		// Act
		const result = await f.source.read("fr");
		// Assert
		expect(result).toMatchObject({
			issueNumber: 42,
			settings: { reminderTime: "09:00" },
			destinations: [],
			publication: { startTime: "18:45" },
		});
		for (const loader of [f.configuration, f.publication, f.social])
			expect(loader.load).toHaveBeenCalledExactlyOnceWith(process.cwd());
	});
	it.each(["configuration", "publication", "social"] as const)(
		"keeps missing or invalid %s fatal for explicit operations",
		async (name) => {
			// Arrange
			const f = draftSourceFixture();
			const error = new Error("Configuration unavailable");
			f[name].load.mockRejectedValue(error);
			// Act
			const result = f.source.read("fr");
			// Assert
			await expect(result).rejects.toBe(error);
		},
	);
});
