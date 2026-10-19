import type { GeneratedImage } from "@meetup-automation/journey";

export class GeminiGenerationResponse {
	text(value: unknown): string {
		const parts = this.parts(value);
		const texts = parts.filter((part) => part.type === "text");
		if (texts.length !== 1 || typeof texts[0]?.text !== "string")
			throw new Error("Invalid generated text response");
		const result: unknown = JSON.parse(texts[0].text);
		if (
			!this.object(result) ||
			Object.keys(result).length !== 1 ||
			typeof result.text !== "string"
		)
			throw new Error("Invalid generated text schema");
		return result.text;
	}
	image(value: unknown): GeneratedImage {
		const images = this.parts(value).filter((part) => part.type === "image");
		const image = images[0];
		if (
			images.length !== 1 ||
			!image ||
			!["image/png", "image/jpeg"].includes(String(image.mime_type)) ||
			typeof image.data !== "string" ||
			image.data.length > 28_000_000 ||
			!/^[A-Za-z0-9+/]+={0,2}$/.test(image.data)
		)
			throw new Error("Invalid generated image response");
		const bytes = Buffer.from(image.data, "base64");
		if (
			!bytes.length ||
			bytes.length > 20_000_000 ||
			bytes.toString("base64") !== image.data
		)
			throw new Error("Invalid generated image encoding");
		return {
			bytes,
			mimeType: image.mime_type === "image/png" ? "image/png" : "image/jpeg",
		};
	}
	private parts(value: unknown): Record<string, unknown>[] {
		if (
			!this.object(value) ||
			value.status !== "completed" ||
			!Array.isArray(value.steps)
		)
			throw new Error("Generation did not complete");
		const parts: Record<string, unknown>[] = [];
		for (const step of value.steps) {
			if (!this.object(step) || step.type !== "model_output") continue;
			if (!Array.isArray(step.content))
				throw new Error("Invalid generation output");
			for (const part of step.content) {
				if (!this.object(part)) throw new Error("Invalid generation content");
				parts.push(part);
			}
		}
		return parts;
	}
	private object(value: unknown): value is Record<string, unknown> {
		return value !== null && typeof value === "object" && !Array.isArray(value);
	}
}
