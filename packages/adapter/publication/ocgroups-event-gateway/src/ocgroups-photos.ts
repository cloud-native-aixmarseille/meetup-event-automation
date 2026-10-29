import {
	type PublicationWriteGuard,
	type ContentMedia,
	ScheduledEventError,
} from "@meetup-automation/publication";
import type { Page } from "playwright-core";
import type { OcgroupsPhotoImage } from "./ocgroups-photo-image.js";

/** OCGroups stores immutable image bytes at /images/{sha256}.{extension}. */
export class OcgroupsPhotos {
	constructor(
		private readonly page: Page,
		private readonly origin: string,
		private readonly images: Pick<OcgroupsPhotoImage, "prepare">,
	) {}

	async matches(cover: ContentMedia): Promise<boolean> {
		const image = await this.images.prepare(cover);
		return (
			(await this.page
				.locator(
					`gallery-field input[name="photos_urls[]"][value="${image.path}"]`,
				)
				.count()) === 1
		);
	}

	async write(
		cover: ContentMedia,
		beforeSubmit: PublicationWriteGuard,
	): Promise<void> {
		const image = await this.images.prepare(cover);
		if (await this.matches(cover)) return;
		await this.page
			.getByRole("button", { name: "Details", exact: true })
			.click();
		await beforeSubmit("asset");
		const response = this.page.waitForResponse(
			(item) =>
				item.url() === `${this.origin}/images` &&
				item.request().method() === "POST",
		);
		const [uploaded] = await Promise.all([
			response,
			this.page
				.locator('gallery-field[field-name="photos_urls"] input[type="file"]')
				.setInputFiles({
					name: image.name,
					mimeType: image.mimeType,
					buffer: Buffer.from(image.bytes),
				}),
		]);
		if (!uploaded.ok()) throw new ScheduledEventError("uncertain");
		const result: unknown = await uploaded.json();
		if (
			!result ||
			typeof result !== "object" ||
			!("url" in result) ||
			result.url !== image.path
		)
			throw new ScheduledEventError("verification");
		await this.page
			.locator(
				`gallery-field input[name="photos_urls[]"][value="${image.path}"]`,
			)
			.waitFor({ state: "attached" });
		if (!(await this.matches(cover)))
			throw new ScheduledEventError("verification");
	}
}
