import * as core from "@actions/core";
import { afterEach, expect, it, vi } from "vitest";
import { eventPublicationConfigurationFixture } from "../testing/event-publication.fixtures.js";
import { GithubActionsComposition } from "./dependency-composition.js";
import { EventPublicationConfiguration } from "./event-publication-configuration.js";
import { PublicationRuntimeActionComposition } from "./publication-runtime-action-composition.js";

vi.mock("@actions/core", () => ({ setOutput: vi.fn() }));
afterEach(() => vi.restoreAllMocks());

it("locates the runtime beside the downloaded bundle independently of the consumer workspace", async () => {
	// Arrange
	const configuration = new GithubActionsComposition()
		.eventPublicationConfiguration()
		.parse(eventPublicationConfigurationFixture());
	const load = vi
		.spyOn(EventPublicationConfiguration.prototype, "load")
		.mockResolvedValue(configuration);
	const action = new PublicationRuntimeActionComposition().action(
		"file:///tmp/downloaded%20automation/actions/publication/prepare-runtime/dist/index.js",
	);

	// Act
	await action.run();

	// Assert
	expect(load).toHaveBeenCalledWith(process.cwd());
	expect(core.setOutput).toHaveBeenCalledWith(
		"runtime-directory",
		"/tmp/downloaded automation",
	);
});
