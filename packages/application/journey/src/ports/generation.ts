/** Provider-neutral requests contain a complete, application-prepared brief. */
export interface GenerationBrief {
	readonly instructions: readonly string[];
	readonly facts: unknown;
	readonly guidance: string;
	readonly language?: "en" | "fr";
}
export interface TextGeneration {
	readonly provider: string;
	readonly model: string;
	supported(): boolean;
	generate(brief: GenerationBrief): Promise<string>;
}
export interface ImageGeneration {
	readonly provider: string;
	readonly model: string;
	supported(): boolean;
	generate(brief: ImageGenerationBrief): Promise<GeneratedImage>;
}

/** Preferred output dimensions; providers may approximate supported sizes. */
export interface ImageGenerationOutput {
	readonly width: number;
	readonly height: number;
	readonly mimeType: "image/png" | "image/jpeg";
}
export interface ImageGenerationBrief extends GenerationBrief {
	readonly output: ImageGenerationOutput;
}
export interface GeneratedImage {
	readonly bytes: Uint8Array;
	readonly mimeType: "image/png" | "image/jpeg";
}
