import type { ImageGenerationBrief } from "@meetup-automation/journey";
import { describe, expect, it, vi } from "vitest";
import { GeminiGenerationPrompt } from "./gemini-generation-prompt.js";
import { GeminiGenerationResponse } from "./gemini-generation-response.js";
import { GeminiImageFormat } from "./gemini-image-format.js";
import { GeminiImageGeneration } from "./gemini-image-generation.js";

describe("Gemini image generation", () => {
	it("translates the requested output dimensions and returns neutral image bytes", async () => {
		// Arrange
		const generate = vi.fn().mockResolvedValue({
			status: "completed",
			steps: [
				{
					type: "model_output",
					content: [{ type: "image", mime_type: "image/png", data: "AQID" }],
				},
			],
		});
		const gateway = new GeminiImageGeneration(
			"gemini-nano-banana-2.1",
			{ generate },
			new GeminiGenerationPrompt(),
			new GeminiGenerationResponse(),
			new GeminiImageFormat(),
		);
		const brief: ImageGenerationBrief = {
			instructions: ["Draw a synthetic object."],
			facts: { shape: "circle" },
			guidance: "",
			output: { width: 1024, height: 1792, mimeType: "image/png" },
		};
		// Act
		const image = await gateway.generate(brief);
		// Assert
		expect(generate).toHaveBeenCalledWith(
			"gemini-nano-banana-2.1",
			expect.stringContaining(brief.instructions[0]),
			{
				type: "image",
				mime_type: "image/png",
				aspect_ratio: "9:16",
				image_size: "2K",
			},
		);
		expect(image).toEqual({
			bytes: Buffer.from([1, 2, 3]),
			mimeType: "image/png",
		});
	});
	it("rejects unsupported dimensions before a provider request", async () => {
		// Arrange
		const generate = vi.fn();
		const gateway = new GeminiImageGeneration(
			"gemini-nano-banana-2.1",
			{ generate },
			new GeminiGenerationPrompt(),
			new GeminiGenerationResponse(),
			new GeminiImageFormat(),
		);
		const brief: ImageGenerationBrief = {
			instructions: ["Draw a synthetic object."],
			facts: {},
			guidance: "",
			output: { width: 0, height: 1024, mimeType: "image/png" },
		};
		// Act
		const result = gateway.generate(brief);
		// Assert
		await expect(result).rejects.toThrow(
			"Unsupported image output requirements",
		);
		expect(generate).not.toHaveBeenCalled();
	});
});
