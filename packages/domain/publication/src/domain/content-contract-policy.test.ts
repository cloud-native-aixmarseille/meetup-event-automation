import { describe, expect, it } from "vitest";
import { contract, mimeType } from "../../testing/content.fixtures.js";
import { ContentContractPolicy } from "./content-contract-policy.js";

describe("template contracts", () => {
	it.each([
		{ ...contract, version: 2 },
		{
			...contract,
			fields: [{ type: "text", token: "host.email", required: true }],
		},
		{
			...contract,
			fields: [
				{ type: "text", token: "host.name", required: false, fallback: "" },
			],
		},
		{ ...contract, fields: [...contract.fields, ...contract.fields] },
		{ ...contract, script: "arbitrary expression" },
	])("rejects invalid contracts before rendering", (input) => {
		// Arrange
		let error: unknown;
		// Act
		try {
			ContentContractPolicy.parse(input, "slides", mimeType);
		} catch (caught) {
			error = caught;
		}
		// Assert
		expect(error).toMatchObject({ code: "contract" });
	});

	it("rejects unsupported Docs image fitting", () => {
		// Arrange
		const input = {
			...contract,
			fields: [
				{
					type: "image",
					token: "speaker.picture",
					slot: "portrait",
					objectId: "image",
					tabId: "tab",
					required: true,
					fit: "CENTER_INSIDE",
				},
			],
		};
		let error: unknown;
		// Act
		try {
			ContentContractPolicy.parse(
				input,
				"slides",
				"application/vnd.google-apps.document",
			);
		} catch (caught) {
			error = caught;
		}
		// Assert
		expect(error).toMatchObject({ code: "contract" });
	});
});
