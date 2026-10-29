import { createHash } from "node:crypto";
import { type Browser, chromium } from "playwright-core";
import { afterAll, beforeAll, expect, it } from "vitest";
import { cover, image, images, photoPath } from "../testing/photo-fixture.js";
import { OcgroupsPhotoImage } from "./ocgroups-photo-image.js";

let browser: Browser;
beforeAll(async () => {
	browser = await chromium.launch({ headless: true });
});
afterAll(async () => {
	await browser?.close();
});

it("preserves approved image bytes that fit the provider limit", async () => {
	// Arrange
	const page = await browser.newPage();
	const subject = new OcgroupsPhotoImage(page, images);
	// Act
	const result = await subject.prepare(cover);
	await page.close();
	// Assert
	expect(result.bytes).toEqual(image.bytes);
	expect(result.path).toBe(photoPath);
});

it.each([
	{ fingerprint: "a".repeat(64) },
	{ width: 2 },
	{ mimeType: "image/jpeg" as const },
])("rejects changed approved metadata %j", async (change) => {
	// Arrange
	const page = await browser.newPage();
	const subject = new OcgroupsPhotoImage(page, images);
	// Act
	const result = subject.prepare({ ...cover, ...change });
	// Assert
	await expect(result).rejects.toThrow("content-review");
	await page.close();
});

it("converts a large approved image to a bounded JPEG without cropping", async () => {
	// Arrange
	const page = await browser.newPage();
	const base64 = await page.evaluate(() => {
		const canvas = document.createElement("canvas");
		canvas.width = 800;
		canvas.height = 600;
		const context = canvas.getContext("2d");
		if (!context) throw new Error("No canvas");
		const pixels = context.createImageData(800, 600);
		let value = 1;
		for (let index = 0; index < pixels.data.length; index++) {
			value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
			pixels.data[index] = index % 4 === 3 ? 255 : value >>> 24;
		}
		context.putImageData(pixels, 0, 0);
		return canvas.toDataURL("image/png").split(",")[1];
	});
	const bytes = Buffer.from(base64, "base64");
	const metadata = {
		...cover,
		width: 800,
		height: 600,
		fingerprint: createHash("sha256").update(bytes).digest("hex"),
	};
	const subject = new OcgroupsPhotoImage(page, {
		load: async () => ({ bytes, mimeType: "image/png" }),
	});
	// Act
	const result = await subject.prepare(metadata);
	const dimensions = await page.evaluate(async (value) => {
		const image = await createImageBitmap(
			new Blob([Uint8Array.from(atob(value), (c) => c.charCodeAt(0))]),
		);
		return [image.width, image.height];
	}, Buffer.from(result.bytes).toString("base64"));
	await page.close();
	// Assert
	expect(bytes.length).toBeGreaterThan(1_048_576);
	expect(result.bytes.length).toBeLessThanOrEqual(1_048_576);
	expect(result.mimeType).toBe("image/jpeg");
	expect(dimensions).toEqual([800, 600]);
});
