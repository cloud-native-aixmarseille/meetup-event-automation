import { describe, expect, it } from "vitest";
import { GoogleSheetsResponse } from "./google-sheets-response.js";

describe("GoogleSheetsResponse", () => {
	const selection = {
		spreadsheetId: "synthetic",
		sheetId: 42,
		firstDataRow: 5,
		lastDataRow: 6,
	};
	const tab = { title: "Responses", columns: 64 };

	it("selects only the requested gid and caps the columns", () => {
		// Arrange
		const codec = new GoogleSheetsResponse();
		const metadata = {
			spreadsheetId: "synthetic",
			sheets: [
				{ properties: { sheetId: 9, title: "Other" } },
				{
					properties: {
						sheetId: 42,
						title: "Selected",
						gridProperties: { rowCount: 20, columnCount: 100 },
					},
				},
			],
		};

		// Act
		const result = codec.tab(metadata, selection);

		// Assert
		expect(result).toEqual({ title: "Selected", columns: 64 });
	});

	it.each([
		{ spreadsheetId: "other", sheets: [] },
		{ spreadsheetId: "synthetic", sheets: [] },
		{
			spreadsheetId: "synthetic",
			sheets: [
				{
					properties: {
						sheetId: 42,
						title: "Selected",
						gridProperties: { rowCount: 5, columnCount: 26 },
					},
				},
			],
		},
		{
			spreadsheetId: "synthetic",
			sheets: [
				{
					properties: {
						sheetId: 42,
						title: "Selected",
						gridProperties: { rowCount: 20, columnCount: 0 },
					},
				},
			],
		},
	])("rejects missing tabs and out-of-grid rows", (metadata) => {
		// Arrange
		const codec = new GoogleSheetsResponse();

		// Act
		const parse = () => codec.tab(metadata, selection);

		// Assert
		expect(parse).toThrow();
	});

	it("quotes tab names without allowing A1 range injection", () => {
		// Arrange
		const codec = new GoogleSheetsResponse();

		// Act
		const result = codec.ranges(
			{ title: "Team's ! responses", columns: 26 },
			selection,
		);

		// Assert
		expect(result).toEqual([
			"'Team''s ! responses'!A1:Z1",
			"'Team''s ! responses'!A5:Z6",
		]);
	});

	it("preserves explicitly selected trailing empty rows", () => {
		// Arrange
		const codec = new GoogleSheetsResponse();
		const response = {
			spreadsheetId: "synthetic",
			sheets: [
				{
					properties: { sheetId: 42 },
					data: [
						{
							rowData: [
								{ values: [{ effectiveValue: { stringValue: "Email" } }] },
							],
						},
						{
							startRow: 4,
							rowData: [
								{
									values: [
										{
											effectiveValue: {
												stringValue: "participant@example.test",
											},
										},
									],
								},
							],
						},
					],
				},
			],
		};

		// Act
		const result = codec.table(response, selection, tab);

		// Assert
		expect(result).toEqual([["Email"], ["participant@example.test"], []]);
	});

	it.each([
		{ startRow: 3, rowData: [] },
		{ startRow: 4, startColumn: 1, rowData: [] },
		{
			startRow: 4,
			rowData: [
				{
					values: [
						{
							effectiveValue: {
								errorValue: { message: "synthetic-private-value" },
							},
						},
					],
				},
			],
		},
		{ startRow: 4, rowData: [{}, {}, {}] },
		{ startRow: 4, rowData: [{ values: Array(65).fill({}) }] },
		{
			startRow: 4,
			rowData: [
				{
					values: [
						{ effectiveValue: { stringValue: "ambiguous", boolValue: true } },
					],
				},
			],
		},
	])("rejects mismatched ranges and malformed cell tables", (rows) => {
		// Arrange
		const codec = new GoogleSheetsResponse();
		const response = {
			spreadsheetId: "synthetic",
			sheets: [
				{
					properties: { sheetId: 42 },
					data: [
						{
							rowData: [
								{ values: [{ effectiveValue: { stringValue: "Email" } }] },
							],
						},
						rows,
					],
				},
			],
		};

		// Act
		const parse = () => codec.table(response, selection, tab);

		// Assert
		expect(parse).toThrow();
	});

	it("decodes raw scalar values and omitted zero indexes", () => {
		// Arrange
		const codec = new GoogleSheetsResponse();
		const response = {
			spreadsheetId: "synthetic",
			sheets: [
				{
					properties: {},
					data: [
						{
							rowData: [
								{ values: [{ effectiveValue: { stringValue: "Email" } }] },
							],
						},
						{
							startRow: 4,
							rowData: [
								{
									values: [
										{},
										{ effectiveValue: { numberValue: 0 } },
										{ effectiveValue: { boolValue: false } },
									],
								},
							],
						},
					],
				},
			],
		};

		// Act
		const result = codec.table(response, { ...selection, sheetId: 0 }, tab);

		// Assert
		expect(result).toEqual([["Email"], ["", 0, false], []]);
	});

	it("rejects a different tab identity returned with the values", () => {
		// Arrange
		const codec = new GoogleSheetsResponse();
		const response = {
			spreadsheetId: "synthetic",
			sheets: [{ properties: { sheetId: 43 }, data: [] }],
		};

		// Act
		const parse = () => codec.table(response, selection, tab);

		// Assert
		expect(parse).toThrow("Unexpected Google Sheets registration tab");
	});
});
