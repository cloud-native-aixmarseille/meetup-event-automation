import { type Browser, chromium } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
	event,
	installBrowserFixture,
	origin,
	remote,
} from "../testing/browser-fixture.js";
import { images, photoPath } from "../testing/photo-fixture.js";
import { OcgroupsPhotoImage } from "./ocgroups-photo-image.js";
import { OcgroupsPhotos } from "./ocgroups-photos.js";

let browser: Browser;
beforeAll(async () => {
	browser = await chromium.launch({ headless: true });
});
afterAll(async () => {
	await browser?.close();
});
async function fixture() {
	const context = await browser.newContext();
	const state = await installBrowserFixture(context, "missing");
	const page = await context.newPage();
	page.setDefaultTimeout(500);
	await page.goto(remote.reviewUrl);
	return {
		context,
		state,
		page,
		photos: new OcgroupsPhotos(
			page,
			origin,
			new OcgroupsPhotoImage(page, images),
		),
	};
}
describe("OCGroups Photos", () => {
	it("preserves existing photos and reuses the approved upload on repeated writes", async () => {
		// Arrange
		const f = await fixture();
		const manual = "/images/manually-added.jpg";
		await f.page.locator("gallery-field").evaluate((gallery, value) => {
			const input = document.createElement("input");
			input.type = "hidden";
			input.name = "photos_urls[]";
			input.value = value;
			gallery.append(input);
		}, manual);
		const guard = vi.fn();
		// Act
		await f.photos.write(event.cover, guard);
		await f.photos.write(event.cover, guard);
		const saved = await f.page
			.locator('gallery-field input[name="photos_urls[]"]')
			.evaluateAll((elements) =>
				elements.map((element) => (element as HTMLInputElement).value),
			);
		await f.context.close();
		// Assert
		expect(saved).toEqual([manual, photoPath]);
		expect(f.state.uploads).toBe(1);
		expect(guard).toHaveBeenCalledExactlyOnceWith("asset");
	});
	it("blocks upload if the source guard rejects", async () => {
		// Arrange
		const f = await fixture();
		const guard = vi.fn().mockRejectedValue(new Error("Stale source"));
		// Act
		const result = f.photos.write(event.cover, guard);
		// Assert
		await expect(result).rejects.toThrow("Stale source");
		expect(f.state.uploads).toBe(0);
		await f.context.close();
	});
	it("rejects a provider response for different image bytes", async () => {
		// Arrange
		const f = await fixture();
		await f.page.route(`${origin}/images`, (route) =>
			route.fulfill({ status: 201, json: { url: "/images/different.jpg" } }),
		);
		// Act
		const result = f.photos.write(event.cover, vi.fn());
		// Assert
		await expect(result).rejects.toThrow("verification");
		expect(f.state.saves).toBe(0);
		await f.context.close();
	});
});
