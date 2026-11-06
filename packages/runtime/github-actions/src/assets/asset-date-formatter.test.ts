import { TemplatingComposition } from "@meetup-automation/templating";
import { describe, expect, it } from "vitest";
import { AssetDateFormatter } from "./asset-date-formatter.js";

describe("asset calendar formats", () => {
	it.each([
		["en", "October 15, 2026"],
		["fr", "15 octobre 2026"],
	])("formats the same event calendar day in %s", (locale, expected) => {
		// Arrange
		const formatter = new AssetDateFormatter(
			new TemplatingComposition().dates(locale),
			locale,
		);

		// Act
		const actual = [
			formatter.format("2026-10-15", "Pacific/Kiritimati"),
			formatter.format("2026-10-15", "America/Los_Angeles"),
			formatter.format("2026-10-15", "Europe/Paris"),
		];

		// Assert
		expect(actual).toEqual([expected, expected, expected]);
	});

	it.each([
		[undefined, "Europe/Paris"],
		["2026-02-30", "Europe/Paris"],
		["2026-2-3", "Europe/Paris"],
		["2026-10-15", "invalid-zone"],
	])("does not format invalid date/timezone %s %s", (date, zone) => {
		// Arrange
		const formatter = new AssetDateFormatter(
			new TemplatingComposition().dates("en"),
			"en",
		);

		// Act
		const actual = formatter.format(date, zone as string);

		// Assert
		expect(actual).toBeUndefined();
	});
});
