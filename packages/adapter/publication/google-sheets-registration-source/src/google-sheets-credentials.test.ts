import { describe, expect, it } from "vitest";
import { GoogleSheetsCredentials } from "./google-sheets-credentials.js";

describe("GoogleSheetsCredentials", () => {
	it("allows only service-account email and key to configure authentication", () => {
		// Arrange
		const parser = new GoogleSheetsCredentials();
		const credentials = JSON.stringify({
			type: "service_account",
			client_email: "reader@example.test",
			private_key: "synthetic-key",
			token_uri: "https://example.test/token",
			subject: "someone@example.test",
		});

		// Act
		const result = parser.parse(credentials);

		// Assert
		expect(result).toEqual({
			email: "reader@example.test",
			key: "synthetic-key",
		});
	});

	it.each([
		"synthetic-secret",
		"null",
		"[]",
		"{}",
		'{"type":"external_account"}',
		'{"type":"service_account","client_email":"reader@example.test","private_key":" "}',
	])("redacts malformed or unsupported credentials", (input) => {
		// Arrange
		const parser = new GoogleSheetsCredentials();

		// Act
		const parse = () => parser.parse(input);

		// Assert
		expect(parse).toThrow("Invalid Google Sheets service-account credentials");
	});
});
