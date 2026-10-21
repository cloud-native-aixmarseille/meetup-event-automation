import { describe, expect, it } from "vitest";
import { MeetupPublicationConfiguration } from "./meetup-publication-configuration.js";

const config = {
	version: 1,
	startTime: "18:45",
	endTime: "20:45",
	venues: { "host-001": { name: "Example Venue", city: "Example City" } },
};

describe("Meetup publication configuration", () => {
	it("uses explicit public venue mappings without retaining contact fields", () => {
		// Arrange
		const input = {
			...config,
			venues: {
				"host-001": {
					...config.venues["host-001"],
					email: "private@example.test",
				},
			},
		};

		// Act
		const result = MeetupPublicationConfiguration.parse(input);

		// Assert
		expect(result).toEqual({
			startTime: "18:45",
			endTime: "20:45",
			venues: config.venues,
		});
		expect(JSON.stringify(result)).not.toContain("private@example.test");
	});

	it.each([
		null,
		{},
		{ ...config, version: 2 },
		{ ...config, startTime: "" },
		{ ...config, endTime: "18:45" },
		{ ...config, venues: [] },
		{ ...config, venues: { host: { name: "<script>", city: "City" } } },
		{ ...config, venues: { host: { name: "Venue", city: "" } } },
	])("rejects incomplete or invalid configuration %j", (input) => {
		// Arrange
		const parse = () => MeetupPublicationConfiguration.parse(input);

		// Act
		let error: unknown;
		try {
			parse();
		} catch (caught) {
			error = caught;
		}

		// Assert
		expect(error).toBeInstanceOf(Error);
	});
});
