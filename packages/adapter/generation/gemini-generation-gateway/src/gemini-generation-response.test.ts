import { describe, expect, it } from "vitest";
import { GeminiGenerationResponse } from "./gemini-generation-response.js";

describe("Gemini output boundary", () => {
	it("decodes long text without imposing a consumer's editorial length limit", () => {
		// Arrange
		const parser = new GeminiGenerationResponse();
		const text = "a".repeat(12001);
		const input = {
			status: "completed",
			steps: [
				{
					type: "model_output",
					content: [{ type: "text", text: JSON.stringify({ text }) }],
				},
			],
		};
		// Act
		const decoded = parser.text(input);
		// Assert
		expect(decoded).toBe(text);
	});
	it("reads structured text from model output steps", () => {
		// Arrange
		const parser = new GeminiGenerationResponse();
		const input = {
			status: "completed",
			steps: [
				{
					type: "model_output",
					content: [
						{ type: "text", text: JSON.stringify({ text: "A public title" }) },
					],
				},
			],
		};
		// Act
		const text = parser.text(input);
		// Assert
		expect(text).toBe("A public title");
	});
	it.each([
		{ status: "failed", steps: [] },
		{ status: "completed", steps: [] },
		{
			status: "completed",
			steps: [
				{
					type: "model_output",
					content: [{ type: "text", text: '{"text":"A title","extra":true}' }],
				},
			],
		},
	])("rejects incomplete or nonconforming text", (input) => {
		// Arrange
		const parser = new GeminiGenerationResponse();
		// Act
		const parse = () => parser.text(input);
		// Assert
		expect(parse).toThrow();
	});
	it("decodes exactly one image without accepting provider URLs", () => {
		// Arrange
		const parser = new GeminiGenerationResponse();
		const input = {
			status: "completed",
			steps: [
				{
					type: "model_output",
					content: [{ type: "image", mime_type: "image/png", data: "AQID" }],
				},
			],
		};
		// Act
		const result = parser.image(input);
		// Assert
		expect(result.bytes).toEqual(Buffer.from([1, 2, 3]));
		expect(result.mimeType).toBe("image/png");
	});
	it("rejects a response containing multiple image alternatives", () => {
		// Arrange
		const parser = new GeminiGenerationResponse();
		const image = { type: "image", mime_type: "image/png", data: "AQID" };
		const input = {
			status: "completed",
			steps: [{ type: "model_output", content: [image, image] }],
		};
		// Act
		const parse = () => parser.image(input);
		// Assert
		expect(parse).toThrow("Invalid generated image response");
	});
});
