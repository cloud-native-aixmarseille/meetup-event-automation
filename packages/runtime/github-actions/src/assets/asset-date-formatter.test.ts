import { describe, expect, it } from "vitest";
import { AssetDateFormatter } from "./asset-date-formatter.js";

describe("asset calendar formats", () => {
	it.each([
		["en", "October", "Thursday, October 15, 2026"],
		["fr", "octobre", "jeudi 15 octobre 2026"],
	])("formats the same event calendar day in %s", (locale, month, weekday) => {
		// Arrange
		const formatter = new AssetDateFormatter(locale);

		// Act
		const actual = [
			formatter.format("2026-10-15", "Pacific/Kiritimati", "month"),
			formatter.format("2026-10-15", "America/Los_Angeles", "numeric"),
			formatter.format("2026-10-15", "Europe/Paris", "weekday"),
		];

		// Assert
		expect(actual).toEqual([month, "15/10/2026", weekday]);
	});

	it.each([
		[undefined, "Europe/Paris"],
		["2026-02-30", "Europe/Paris"],
		["2026-2-3", "Europe/Paris"],
		["2026-10-15", "invalid-zone"],
	])("does not format invalid date/timezone %s %s", (date, zone) => {
		// Arrange
		const formatter = new AssetDateFormatter("en");

		// Act
		const actual = formatter.format(date, zone as string);

		// Assert
		expect(actual).toBeUndefined();
	});
});
