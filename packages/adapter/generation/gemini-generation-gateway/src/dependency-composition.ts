import { GeminiGenerationHttp } from "./gemini-generation-http.js";
import { GeminiGenerationResponse } from "./gemini-generation-response.js";
import { GeminiGenerationPrompt } from "./gemini-generation-prompt.js";
import { GeminiImageGeneration } from "./gemini-image-generation.js";
import { GeminiImageFormat } from "./gemini-image-format.js";
import { GeminiTextGeneration } from "./gemini-text-generation.js";

export class GeminiGenerationGatewayComposition {
	text(model: string, apiKey: string): GeminiTextGeneration {
		return new GeminiTextGeneration(
			model,
			new GeminiGenerationHttp(fetch, apiKey),
			new GeminiGenerationPrompt(),
			new GeminiGenerationResponse(),
		);
	}
	image(model: string, apiKey: string): GeminiImageGeneration {
		return new GeminiImageGeneration(
			model,
			new GeminiGenerationHttp(fetch, apiKey),
			new GeminiGenerationPrompt(),
			new GeminiGenerationResponse(),
			new GeminiImageFormat(),
		);
	}
}
