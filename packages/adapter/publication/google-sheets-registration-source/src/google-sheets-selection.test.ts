import { describe, expect, it } from "vitest";
import { GoogleSheetsSelection } from "./google-sheets-selection.js";

describe("GoogleSheetsSelection", () => {
	it.each(["?gid=0", "#gid=0", "?gid=0#gid=0"])(
		"selects an explicit tab from %s",
		(suffix) => {
			// Arrange
			const parser = new GoogleSheetsSelection();

			// Act
			const result = parser.parse(
				`https://docs.google.com/spreadsheets/d/synthetic_sheet/edit${suffix}`,
				3,
				1002,
			);

			// Assert
			expect(result).toEqual({
				spreadsheetId: "synthetic_sheet",
				sheetId: 0,
				firstDataRow: 3,
				lastDataRow: 1002,
			});
		},
	);

	it.each([
		"https://docs.google.com/spreadsheets/d/synthetic/edit",
		"http://docs.google.com/spreadsheets/d/synthetic/edit?gid=1",
		"https://example.com/spreadsheets/d/synthetic/edit?gid=1",
		"https://secret@docs.google.com/spreadsheets/d/synthetic/edit?gid=1",
		"https://docs.google.com/spreadsheets/d/synthetic/edit?gid=1#gid=2",
		"https://docs.google.com/spreadsheets/d/synthetic/edit?gid=1&gid=1",
		"https://docs.google.com/spreadsheets/d/synthetic/edit?gid=1&redirect=https://example.com",
		"https://docs.google.com/spreadsheets/d/synthetic/edit#gid=-1",
		"https://docs.google.com/spreadsheets/d/synthetic/edit#gid=2147483648",
		"https://docs.google.com/spreadsheets/d/synthetic/edit#gid=1&range=A1",
		"https://docs.google.com/spreadsheets/d/synthetic/export?gid=1",
		"not a URL with synthetic-private-data",
	])("rejects ambiguous or untrusted source URLs", (url) => {
		// Arrange
		const parser = new GoogleSheetsSelection();

		// Act
		const parse = () => parser.parse(url, 2, 4);

		// Assert
		expect(parse).toThrow(
			"Invalid Google Sheets registration source selection",
		);
	});

	it.each([
		[1, 2],
		[3, 2],
		[2, 1002],
		[2.5, 4],
		[2, Number.NaN],
		[10000000, 10000001],
	])("rejects invalid row bounds %s:%s", (first, last) => {
		// Arrange
		const parser = new GoogleSheetsSelection();

		// Act
		const parse = () =>
			parser.parse(
				"https://docs.google.com/spreadsheets/d/synthetic/edit#gid=1",
				first,
				last,
			);

		// Assert
		expect(parse).toThrow(
			"Invalid Google Sheets registration source selection",
		);
	});
});
