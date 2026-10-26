import * as core from "@actions/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eventPublicationConfigurationFixture } from "../testing/event-publication.fixtures.js";
import { GithubActionsComposition } from "./dependency-composition.js";
import { PublicationRuntimeAction } from "./publication-runtime-action.js";

vi.mock("@actions/core", () => ({ setOutput: vi.fn() }));
beforeEach(() => vi.clearAllMocks());

describe("publication runtime preparation", () => {
	it.each([
		{ providers: ["meetup"], requiresSolver: true },
		{ providers: ["ocgroups"], requiresSolver: false },
		{ providers: ["meetup", "ocgroups"], requiresSolver: true },
		{ providers: [], requiresSolver: false },
	])(
		"selects the required runtime for $providers",
		async ({ providers, requiresSolver }) => {
			// Arrange
			const configuration = new GithubActionsComposition()
				.eventPublicationConfiguration()
				.parse(eventPublicationConfigurationFixture());
			const load = vi.fn().mockResolvedValue({
				...configuration,
				destinations: configuration.destinations.filter((destination) =>
					providers.includes(destination.provider),
				),
			});
			const action = new PublicationRuntimeAction({ load }, "/automation/");
			// Act
			const report = await action.run();
			// Assert
			expect(load).toHaveBeenCalledWith(process.cwd());
			expect(core.setOutput).toHaveBeenCalledWith(
				"requires-challenge-solver",
				requiresSolver,
			);
			expect(core.setOutput).toHaveBeenCalledWith(
				"runtime-directory",
				"/automation/",
			);
			expect(report).toEqual({ details: [], diagnostics: [] });
		},
	);
	it("does not emit runtime capabilities when configuration is invalid", async () => {
		// Arrange
		const action = new PublicationRuntimeAction(
			{ load: vi.fn().mockRejectedValue(new Error("Invalid configuration")) },
			"/automation/",
		);
		// Act
		const result = action.run();
		// Assert
		await expect(result).rejects.toThrow("Invalid configuration");
		expect(core.setOutput).not.toHaveBeenCalled();
	});
});
