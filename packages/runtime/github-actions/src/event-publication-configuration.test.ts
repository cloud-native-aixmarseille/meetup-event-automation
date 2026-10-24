import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { eventPublicationConfigurationFixture } from "../testing/event-publication.fixtures.js";
import { GithubActionsComposition } from "./dependency-composition.js";
import type { EventPublicationConfiguration } from "./event-publication-configuration.js";

describe("shared publication configuration", () => {
	it("shares the schedule across typed destinations and retains OCGroups public venue data", () => {
		// Arrange
		const input = eventPublicationConfigurationFixture();
		const subject: EventPublicationConfiguration =
			new GithubActionsComposition().eventPublicationConfiguration();
		// Act
		const result = subject.parse(input);
		// Assert
		expect(
			result.destinations.map((destination) => destination.provider),
		).toEqual(["meetup", "ocgroups"]);
		expect(
			result.destinations.every(
				(destination) =>
					destination.settings.startTime === result.schedule.startTime,
			),
		).toBe(true);
		expect(result.destinations[1].settings.venues["host-0001"]).toEqual(
			input.venues["host-0001"],
		);
	});
	it("loads the common schedule from the single configuration file", async () => {
		// Arrange
		const root = await mkdtemp(join(tmpdir(), "publication-configuration-"));
		await mkdir(join(root, ".github"));
		await writeFile(
			join(root, ".github/event-publication.json"),
			JSON.stringify(eventPublicationConfigurationFixture()),
		);
		try {
			// Act
			const result = await new GithubActionsComposition()
				.eventPublicationConfiguration()
				.load(root);
			// Assert
			expect(result.schedule.startTime).toBe("18:45");
			expect(result.destinations).toHaveLength(2);
		} finally {
			await rm(root, { recursive: true });
		}
	});
	it("allows content workflows to use an explicitly manual publication configuration", () => {
		// Arrange
		const input = {
			...eventPublicationConfigurationFixture(),
			destinations: [],
		};
		// Act
		const result = new GithubActionsComposition()
			.eventPublicationConfiguration()
			.parse(input);
		// Assert
		expect(result.destinations).toEqual([]);
		expect(result.schedule.startTime).toBe("18:45");
	});
	it.each([
		undefined,
		[{ provider: "unknown" }],
		[{ provider: "meetup" }, { provider: "meetup" }],
		[{ provider: "meetup", startTime: "19:00" }],
		[{ provider: "ocgroups" }],
	])("rejects ambiguous or incomplete destinations: %j", (destinations) => {
		// Arrange
		const input = { ...eventPublicationConfigurationFixture(), destinations };
		// Act
		const parse = () =>
			new GithubActionsComposition()
				.eventPublicationConfiguration()
				.parse(input);
		// Assert
		expect(parse).toThrow();
	});
});
