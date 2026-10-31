import { expect, it } from "vitest";
import { WixImageUrl } from "./wix-image-url.js";

it.each(["fit", "fill", "crop"])(
	"requests PNG while preserving a Wix %s transformation",
	(method) => {
		// Arrange
		const url = `https://static.wixstatic.com/media/photo.jpg/v1/${method}/w_500,h_400,q_90/portrait.webp`;
		const policy = new WixImageUrl();

		// Act
		const result = policy.png(url);

		// Assert
		expect(result).toBe(url.replace(/\.webp$/, ".png"));
	},
);

it.each([
	"https://images.example.org/media/photo.jpg/v1/fit/w_500/portrait.webp",
	"https://static.wixstatic.com.example.org/media/photo.jpg/v1/fit/w_500/portrait.webp",
	"https://static.wixstatic.com/media/original.webp",
	"https://static.wixstatic.com/media/photo.jpg/v1/fit/w_500/portrait.png",
	"https://static.wixstatic.com/media/photo.jpg/v2/fit/w_500/portrait.webp",
	"https://static.wixstatic.com/media/photo.jpg/v1/fit/w_500/portrait.webp?variant=other",
	"https://static.wixstatic.com/media/photo.jpg/v1/fit/w_500/portrait.webp#fragment",
	"https://user:password@static.wixstatic.com/media/photo.jpg/v1/fit/w_500/portrait.webp",
	"http://static.wixstatic.com/media/photo.jpg/v1/fit/w_500/portrait.webp",
])("leaves unsupported source URLs unchanged: %s", (url) => {
	// Arrange
	const policy = new WixImageUrl();

	// Act
	const result = policy.png(url);

	// Assert
	expect(result).toBeUndefined();
});
