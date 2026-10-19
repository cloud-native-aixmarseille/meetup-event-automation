import type { GenerationBrief } from "@meetup-automation/journey";
import { describe, expect, it, vi } from "vitest";
import { GeminiGenerationPrompt } from "./gemini-generation-prompt.js";
import { GeminiGenerationResponse } from "./gemini-generation-response.js";
import { GeminiTextGeneration } from "./gemini-text-generation.js";

const brief: GenerationBrief = {
	instructions: ["Write a concise event title."],
	facts: { topic: "Observability" },
	guidance: "Use French.",
};

describe("Gemini text generation", () => {
	it.each(["gemini-3.8-flash", "gemini-3.6-flash", "gemini-4-argon"])(
		"requests structured text from supported model %s",
		async (model) => {
			// Arrange
			const generate = vi.fn().mockResolvedValue({
				status: "completed",
				steps: [
					{
						type: "model_output",
						content: [
							{
								type: "text",
								text: JSON.stringify({ text: "Observer ses clusters" }),
							},
						],
					},
				],
			});
			const gateway = new GeminiTextGeneration(
				model,
				{ generate },
				new GeminiGenerationPrompt(),
				new GeminiGenerationResponse(),
			);

			// Act
			const result = await gateway.generate(brief);

			// Assert
			expect(result).toBe("Observer ses clusters");
			expect(generate).toHaveBeenCalledExactlyOnceWith(
				model,
				expect.stringContaining("Observability"),
				{
					type: "text",
					mime_type: "application/json",
					schema: {
						type: "object",
						properties: { text: { type: "string" } },
						required: ["text"],
						additionalProperties: false,
					},
				},
			);
		},
	);

	it("rejects an unsupported model before calling the provider", async () => {
		// Arrange
		const generate = vi.fn();
		const gateway = new GeminiTextGeneration(
			"unsupported-model",
			{ generate },
			new GeminiGenerationPrompt(),
			new GeminiGenerationResponse(),
		);

		// Act
		const result = gateway.generate(brief);

		// Assert
		await expect(result).rejects.toThrow("Unsupported structured-text model");
		expect(generate).not.toHaveBeenCalled();
	});

	it("propagates provider failures", async () => {
		// Arrange
		const error = new Error("Provider unavailable");
		const generate = vi.fn().mockRejectedValue(error);
		const gateway = new GeminiTextGeneration(
			"gemini-3.8-flash",
			{ generate },
			new GeminiGenerationPrompt(),
			new GeminiGenerationResponse(),
		);

		// Act
		const result = gateway.generate(brief);

		// Assert
		await expect(result).rejects.toBe(error);
	});
});
