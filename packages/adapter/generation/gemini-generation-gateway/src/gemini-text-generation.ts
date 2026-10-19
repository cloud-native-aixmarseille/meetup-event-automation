import type {
	GenerationBrief,
	TextGeneration,
} from "@meetup-automation/journey";
import type { GeminiGenerationHttp } from "./gemini-generation-http.js";
import type { GeminiGenerationResponse } from "./gemini-generation-response.js";
import type { GeminiGenerationPrompt } from "./gemini-generation-prompt.js";

export class GeminiTextGeneration implements TextGeneration {
	readonly provider = "gemini";
	constructor(
		readonly model: string,
		private readonly http: Pick<GeminiGenerationHttp, "generate">,
		private readonly prompt: Pick<GeminiGenerationPrompt, "encode">,
		private readonly response: Pick<GeminiGenerationResponse, "text">,
	) {}
	supported(): boolean {
		return ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-4-argon"].includes(
			this.model,
		);
	}
	async generate(brief: GenerationBrief): Promise<string> {
		if (!this.supported()) throw new Error("Unsupported structured-text model");
		const result = await this.http.generate(
			this.model,
			this.prompt.encode(brief),
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
		return this.response.text(result);
	}
}
