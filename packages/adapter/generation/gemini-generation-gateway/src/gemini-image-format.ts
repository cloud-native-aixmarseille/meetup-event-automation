import type { ImageGenerationOutput } from "@meetup-automation/journey";

/** Maps preferred dimensions to Gemini's common supported image configurations. */
export class GeminiImageFormat {
	encode(output: ImageGenerationOutput) {
		const { width, height, mimeType } = output;
		if (
			!Number.isInteger(width) ||
			!Number.isInteger(height) ||
			width < 1 ||
			height < 1 ||
			width > 4096 ||
			height > 4096 ||
			!["image/png", "image/jpeg"].includes(mimeType)
		)
			throw new Error("Unsupported image output requirements");
		const edge = Math.max(width, height);
		return {
			type: "image",
			mime_type: "image/jpeg",
			delivery: "inline",
			aspect_ratio: this.aspectRatio(width / height),
			image_size: edge <= 1024 ? "1K" : edge <= 2048 ? "2K" : "4K",
		};
	}
	private aspectRatio(requested: number): string {
		const ratios = [
			[1, 1],
			[2, 3],
			[3, 2],
			[3, 4],
			[4, 3],
			[4, 5],
			[5, 4],
			[9, 16],
			[16, 9],
			[21, 9],
		] as const;
		let closest: readonly [number, number] = ratios[0];
		let distance = Number.POSITIVE_INFINITY;
		for (const ratio of ratios) {
			const difference = Math.abs(Math.log(requested / (ratio[0] / ratio[1])));
			if (difference < distance) {
				distance = difference;
				closest = ratio;
			}
		}
		return `${closest[0]}:${closest[1]}`;
	}
}
