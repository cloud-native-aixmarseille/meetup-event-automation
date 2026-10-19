import { describe, expect, it } from "vitest";
import { DateTemplateFormatter } from "./date-template-formatter.js";

describe("template calendar-date formatting", () => {
	it.each([
		["en", "YYYY-MM-DD", "2027-04-05"],
		["fr", "DD/MM/YYYY", "05/04/2027"],
		["en", "YYYYMMDD", "20270405"],
		["fr", "D.M.YY", "5.4.27"],
		["en", "dddd D MMMM YYYY", "Monday 5 April 2027"],
		["fr", "dddd D MMMM YYYY", "lundi 5 avril 2027"],
		["en", "ddd D MMM YYYY", "Mon 5 Apr 2027"],
		["fr", "ddd D MMM YYYY", "lun. 5 avr. 2027"],
		["en", "long", "April 5, 2027"],
		["fr", "month", "avril"],
		["fr", "weekday", "lundi 5 avril 2027"],
	])("formats %s calendar dates with %s", (locale, pattern, expected) => {
		// Arrange
		const formatter = new DateTemplateFormatter(locale);

		// Act
		const result = formatter.format("2027-04-05", pattern);

		// Assert
		expect(result).toBe(expected);
	});

	it.each([
		"",
		" ",
		"yyyy-MM-dd",
		"YYYY-MM-DD HH:mm",
		"YYY-MM-DD",
		"YYYY-MMMMM-D",
		"YYYY-MM-DDD",
		"YYYY-MM-DD:Z",
	])("rejects unsupported pattern %s", (pattern) => {
		// Arrange
		const formatter = new DateTemplateFormatter("en");

		// Act
		const format = () => formatter.format("2027-04-05", pattern);

		// Assert
		expect(format).toThrow("Invalid template format");
	});

	it.each([
		"2027-02-29",
		"2028-02-30",
		"2027-04-31",
		"2027-13-01",
		"2027-4-5",
		"2027-04-05T00:00:00Z",
		"",
	])("rejects invalid event date %s", (date) => {
		// Arrange
		const formatter = new DateTemplateFormatter("fr");

		// Act
		const format = () => formatter.format(date, "YYYY-MM-DD");

		// Assert
		expect(format).toThrow("Invalid template date");
	});

	it("retains a leap day as a calendar date", () => {
		// Arrange
		const formatter = new DateTemplateFormatter("en-US");

		// Act
		const result = formatter.format("2028-02-29", "dddd D MMMM YYYY");

		// Assert
		expect(result).toBe("Tuesday 29 February 2028");
	});
});
