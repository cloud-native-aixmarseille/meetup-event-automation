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
