import type {
	GeneratedImage,
	ImageGeneration,
	ImageGenerationBrief,
} from "@meetup-automation/journey";
import type { GeminiGenerationHttp } from "./gemini-generation-http.js";
import type { GeminiGenerationPrompt } from "./gemini-generation-prompt.js";
import type { GeminiGenerationResponse } from "./gemini-generation-response.js";
import type { GeminiImageFormat } from "./gemini-image-format.js";

export class GeminiImageGeneration implements ImageGeneration {
	readonly provider = "gemini";
	constructor(
		readonly model: string,
		private readonly http: Pick<GeminiGenerationHttp, "generate">,
		private readonly prompt: Pick<GeminiGenerationPrompt, "encode">,
		private readonly response: Pick<GeminiGenerationResponse, "image">,
		private readonly format: Pick<GeminiImageFormat, "encode">,
	) {}
	supported(): boolean {
		return [
			"gemini-nano-banana-2.1",
			"gemini-3-pro-image",
			"gemini-3.1-flash-image",
		].includes(this.model);
	}
	async generate(brief: ImageGenerationBrief): Promise<GeneratedImage> {
		if (!this.supported())
			throw new Error("Unsupported image-generation model");
		const result = await this.http.generate(
			this.model,
			this.prompt.encode(brief),
			this.format.encode(brief.output),
		);
		return this.response.image(result);
	}
}
