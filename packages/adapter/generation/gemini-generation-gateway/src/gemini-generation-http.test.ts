import { describe, expect, it, vi } from "vitest";
import { GeminiGenerationHttp } from "./gemini-generation-http.js";

describe("stateless Gemini transport", () => {
	it("bounds the wire response and cancels oversized bodies without retrying", async () => {
		// Arrange
		const cancel = vi.fn();
		const body = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(new Uint8Array(30_000_001));
			},
			cancel,
		});
		const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(body));
		const client = new GeminiGenerationHttp(request, "synthetic-key");
		// Act
		const result = client.generate("synthetic-model", "public facts", {
			type: "text",
		});
		// Assert
		await expect(result).rejects.toThrow(
			"Content provider response exceeds limit",
		);
		expect(cancel).toHaveBeenCalledTimes(1);
		expect(request).toHaveBeenCalledTimes(1);
	});
	it("sends isolated requests without tools, history or storage", async () => {
		// Arrange
		const request = vi
			.fn<typeof fetch>()
			.mockImplementation(
				async () =>
					new Response('{"status":"completed","steps":[]}', { status: 200 }),
			);
		const client = new GeminiGenerationHttp(request, "synthetic-key");
		// Act
		await client.generate("synthetic-model", "public facts", { type: "image" });
		await client.generate("synthetic-model", "different scene", {
			type: "image",
		});
		const bodies = request.mock.calls.map((call) =>
			JSON.parse(String(call[1]?.body)),
		);
		// Assert
		expect(bodies).toEqual([
			{
				model: "synthetic-model",
				input: "public facts",
				store: false,
				response_format: { type: "image" },
			},
			{
				model: "synthetic-model",
				input: "different scene",
				store: false,
				response_format: { type: "image" },
			},
		]);
		expect(request.mock.calls[0][0]).toBe(
			"https://generativelanguage.googleapis.com/v1beta/interactions",
		);
	});
	it("does not retry or expose an error response body", async () => {
		// Arrange
		const request = vi
			.fn<typeof fetch>()
			.mockResolvedValue(
				new Response("private provider payload", { status: 503 }),
			);
		const client = new GeminiGenerationHttp(request, "synthetic-key");
		// Act
		const result = client.generate("model", "prompt", {});
		// Assert
		await expect(result).rejects.toThrow("Content provider request failed");
		expect(request).toHaveBeenCalledTimes(1);
	});
});
