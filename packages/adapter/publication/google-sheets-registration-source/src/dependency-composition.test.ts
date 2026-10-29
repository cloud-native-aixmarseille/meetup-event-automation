import { JWT } from "google-auth-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GoogleSheetsRegistrationSourceComposition } from "./dependency-composition.js";

describe("GoogleSheetsRegistrationSourceComposition", () => {
	afterEach(() => vi.restoreAllMocks());

	it("binds a service-account JWT with only the Sheets read-only scope", async () => {
		// Arrange
		const tokens = vi
			.spyOn(JWT.prototype, "getAccessToken")
			.mockImplementation(async () => ({ token: "synthetic-token" }));
		const request = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(
				Response.json({
					spreadsheetId: "synthetic",
					sheets: [
						{
							properties: {
								sheetId: 0,
								title: "Responses",
								gridProperties: { rowCount: 5, columnCount: 26 },
							},
						},
					],
				}),
			)
			.mockResolvedValueOnce(
				Response.json({
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
									startRow: 1,
									rowData: [
										{
											values: [
												{
													effectiveValue: {
														stringValue: "member@example.test",
													},
												},
											],
										},
									],
								},
							],
						},
					],
				}),
			);
		const composition = new GoogleSheetsRegistrationSourceComposition(request);
		const source = composition.source({
			url: "https://docs.google.com/spreadsheets/d/synthetic/edit#gid=0",
			firstDataRow: 2,
			lastDataRow: 2,
			credentials: JSON.stringify({
				type: "service_account",
				client_email: "reader@example.test",
				private_key: "synthetic-key",
				token_uri: "https://example.test/token",
			}),
		});

		// Act
		const result = await source.read();

		// Assert
		expect(result).toEqual([["Email"], ["member@example.test"]]);
		expect(tokens.mock.instances[0]).toMatchObject({
			email: "reader@example.test",
			key: "synthetic-key",
			scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
		});
	});
});
