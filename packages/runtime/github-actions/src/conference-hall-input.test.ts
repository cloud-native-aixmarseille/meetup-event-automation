import * as core from "@actions/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConferenceHallInput } from "./conference-hall-input.js";

vi.mock("@actions/core", async (importOriginal) => ({
	...(await importOriginal<typeof core>()),
	setSecret: vi.fn(),
}));

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubEnv("INPUT_CONFERENCE-HALL-EVENT", "example-cfp");
	vi.stubEnv("INPUT_CONFERENCE-HALL-API-KEY", "synthetic-source-key");
});
afterEach(() => vi.unstubAllEnvs());

describe("required Conference Hall inputs", () => {
	it("normalizes the organizer event URL independently of API identity", () => {
		// Arrange
		vi.stubEnv(
			"INPUT_CONFERENCE-HALL-EVENT-URL",
			" https://conference-hall.io/team/example-team/example-cfp/ ",
		);
		// Act
		const url = new ConferenceHallInput().readEventUrl("example-cfp");
		// Assert
		expect(url).toBe(
			"https://conference-hall.io/team/example-team/example-cfp",
		);
	});
	it.each([
		"https://example.test/team/example-team/example-cfp",
		"https://conference-hall.io/team/example-team/other-cfp",
		"https://conference-hall.io/team/example-team/example-cfp/proposals/17",
		"https://conference-hall.io/team/example-team/example-cfp?query=1",
		"https://user:password@conference-hall.io/team/example-team/example-cfp",
	])("rejects an invalid or mismatched organizer URL: %s", (value) => {
		// Arrange
		vi.stubEnv("INPUT_CONFERENCE-HALL-EVENT-URL", value);
		// Act
		const read = () => new ConferenceHallInput().readEventUrl("example-cfp");
		// Assert
		expect(read).toThrow("conference-hall-event-url");
	});

	it.each([
		["conference-hall-event", undefined],
		["conference-hall-event", ""],
		["conference-hall-event", "  "],
		["conference-hall-api-key", undefined],
		["conference-hall-api-key", ""],
		["conference-hall-api-key", "  "],
	])("rejects missing or blank %s (%j)", (name, value) => {
		// Arrange
		vi.stubEnv(`INPUT_${name?.toUpperCase()}`, value);

		// Act
		const read = () => new ConferenceHallInput().read();

		// Assert
		expect(read).toThrow(`Input required and not supplied: ${name}`);
	});

	it("normalizes both settings and masks the required API key", () => {
		// Arrange
		vi.stubEnv("INPUT_CONFERENCE-HALL-EVENT", " example-cfp ");
		vi.stubEnv("INPUT_CONFERENCE-HALL-API-KEY", " synthetic-source-key ");

		// Act
		const input = new ConferenceHallInput().read();

		// Assert
		expect(input).toEqual({
			conferenceHallEvent: "example-cfp",
			conferenceHallApiKey: "synthetic-source-key",
		});
		expect(core.setSecret).toHaveBeenCalledWith("synthetic-source-key");
	});
});
