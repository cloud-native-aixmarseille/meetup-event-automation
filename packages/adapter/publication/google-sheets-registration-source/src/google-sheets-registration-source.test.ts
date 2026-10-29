import { describe, expect, it, vi } from "vitest";
import { GoogleSheetsRegistrationSource } from "./google-sheets-registration-source.js";
import { GoogleSheetsResponse } from "./google-sheets-response.js";

describe("GoogleSheetsRegistrationSource", () => {
	const selection = {
		spreadsheetId: "synthetic",
		sheetId: 42,
		firstDataRow: 5,
		lastDataRow: 6,
	};
	const metadata = {
		spreadsheetId: "synthetic",
		sheets: [
			{
				properties: {
					sheetId: 42,
					title: "Team's responses",
					gridProperties: { rowCount: 20, columnCount: 64 },
				},
			},
		],
	};
	const values = {
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
									{ effectiveValue: { stringValue: "member@example.test" } },
								],
							},
							{
								values: [
									{ effectiveValue: { stringValue: "another@example.test" } },
								],
							},
						],
					},
				],
			},
		],
	};

	it("reads only metadata, the header, and the selected rows using GET", async () => {
		// Arrange
		const request = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(Response.json(metadata))
			.mockResolvedValueOnce(Response.json(values));
		const authentication = {
			getAccessToken: vi.fn().mockResolvedValue({ token: "synthetic-token" }),
		};
		const source = new GoogleSheetsRegistrationSource(
			selection,
			authentication,
			request,
			new GoogleSheetsResponse(),
		);

		// Act
		const result = await source.read();
		const metadataUrl = new URL(String(request.mock.calls[0][0]));
		const valuesUrl = new URL(String(request.mock.calls[1][0]));

		// Assert
		expect(result).toEqual([
			["Email"],
			["member@example.test"],
			["another@example.test"],
		]);
		expect(request).toHaveBeenCalledTimes(2);
		expect(metadataUrl.pathname).toBe("/v4/spreadsheets/synthetic");
		expect(metadataUrl.searchParams.get("fields")).toBe(
			"spreadsheetId,sheets.properties(sheetId,title,gridProperties(rowCount,columnCount))",
		);
		expect(valuesUrl.pathname).toBe("/v4/spreadsheets/synthetic");
		expect(valuesUrl.searchParams.getAll("ranges")).toEqual([
			"'Team''s responses'!A1:BL1",
			"'Team''s responses'!A5:BL6",
		]);
		expect(valuesUrl.searchParams.get("fields")).toBe(
			"spreadsheetId,sheets(properties(sheetId),data(startRow,startColumn,rowData(values(effectiveValue))))",
		);
		for (const [url, options] of request.mock.calls) {
			expect(new URL(String(url)).origin).toBe("https://sheets.googleapis.com");
			expect(options).toMatchObject({
				method: "GET",
				redirect: "error",
				headers: { Authorization: "Bearer synthetic-token" },
			});
		}
	});

	it("rejects a tab title swap between metadata and data reads", async () => {
		// Arrange
		const request = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(Response.json(metadata))
			.mockResolvedValueOnce(
				Response.json({
					...values,
					sheets: [{ ...values.sheets[0], properties: { sheetId: 99 } }],
				}),
			);
		const source = new GoogleSheetsRegistrationSource(
			selection,
			{ getAccessToken: async () => ({ token: "synthetic" }) },
			request,
			new GoogleSheetsResponse(),
		);

		// Act
		const result = source.read();

		// Assert
		await expect(result).rejects.toThrow(
			"Google Sheets registration source could not be read",
		);
		expect(request).toHaveBeenCalledTimes(2);
	});

	it("never fetches values when the selected gid is absent", async () => {
		// Arrange
		const request = vi
			.fn<typeof fetch>()
			.mockResolvedValue(
				Response.json({ spreadsheetId: "synthetic", sheets: [] }),
			);
		const source = new GoogleSheetsRegistrationSource(
			selection,
			{ getAccessToken: async () => ({ token: "synthetic" }) },
			request,
			new GoogleSheetsResponse(),
		);

		// Act
		const result = source.read();

		// Assert
		await expect(result).rejects.toThrow(
			"Google Sheets registration source could not be read",
		);
		expect(request).toHaveBeenCalledTimes(1);
	});

	it("redacts authentication errors before any source request", async () => {
		// Arrange
		const request = vi.fn<typeof fetch>();
		const authentication = {
			getAccessToken: vi
				.fn()
				.mockRejectedValue(new Error("synthetic-private-key")),
		};
		const source = new GoogleSheetsRegistrationSource(
			selection,
			authentication,
			request,
			new GoogleSheetsResponse(),
		);

		// Act
		const result = source.read();

		// Assert
		await expect(result).rejects.toThrow(
			"Google Sheets registration source could not be read",
		);
		expect(request).not.toHaveBeenCalled();
	});

	it.each([403, 429, 302])(
		"redacts provider failures with status %s",
		async (status) => {
			// Arrange
			const request = vi
				.fn<typeof fetch>()
				.mockResolvedValue(new Response("private-provider-record", { status }));
			const source = new GoogleSheetsRegistrationSource(
				selection,
				{ getAccessToken: async () => ({ token: "synthetic" }) },
				request,
				new GoogleSheetsResponse(),
			);

			// Act
			const result = source.read();

			// Assert
			await expect(result).rejects.toThrow(
				"Google Sheets registration source could not be read",
			);
			expect(request).toHaveBeenCalledTimes(1);
		},
	);

	it("rejects responses beyond the byte bound", async () => {
		// Arrange
		const request = vi
			.fn<typeof fetch>()
			.mockResolvedValue(new Response("x".repeat(4 * 1024 * 1024 + 1)));
		const source = new GoogleSheetsRegistrationSource(
			selection,
			{ getAccessToken: async () => ({ token: "synthetic" }) },
			request,
			new GoogleSheetsResponse(),
		);

		// Act
		const result = source.read();

		// Assert
		await expect(result).rejects.toThrow(
			"Google Sheets registration source could not be read",
		);
	});
});
