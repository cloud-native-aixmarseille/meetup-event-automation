import type { ContentImageBytes } from "@meetup-automation/publication";
import type { Page } from "playwright-core";

/** Owns the English editor's photo picker, crop confirmation, and observed photo ID. */
export class MeetupCoverPhoto {
	constructor(private readonly page: Page) {}

	async persisted(): Promise<string> {
		await this.page
			.locator('div[style*="https://secure.meetupstatic.com/photos/event/"]')
			.filter({ visible: true })
			.waitFor();
		const photoId = await this.current();
		if (!photoId) throw new Error("The persisted cover photo is unavailable");
		return photoId;
	}

	async current(): Promise<string | undefined> {
		const source = await this.source();
		return source ? this.identifier(source) : undefined;
	}

	async upload(image: ContentImageBytes, fingerprint: string): Promise<string> {
		const previous = await this.source();
		await this.open(previous);
		await this.page
			.getByRole("dialog")
			.locator('input[type="file"]')
			.setInputFiles({
				name: `cover-${fingerprint}.${image.mimeType === "image/png" ? "png" : "jpg"}`,
				mimeType: image.mimeType,
				buffer: Buffer.from(image.bytes),
			});
		await this.page
			.getByRole("dialog")
			.getByRole("button", { name: "Save", exact: true })
			.click();
		await this.page.getByRole("dialog").waitFor({ state: "hidden" });
		await this.page.waitForFunction(
			(previous) =>
				[
					...document.querySelectorAll<HTMLElement>(
						'div[style*="background-image"]',
					),
				].some(
					(element) =>
						!element.closest('[role="dialog"]') &&
						element.style.backgroundImage.includes("/photos/event/") &&
						element.style.backgroundImage !== previous,
				),
			previous,
		);
		const photoId = await this.current();
		if (!photoId || (previous && photoId === this.identifier(previous)))
			throw new Error("Meetup did not return a cover photo identity");
		return photoId;
	}

	private async open(previous: string | undefined): Promise<void> {
		if (previous) {
			const cover = this.page
				.locator('div[style*="https://secure.meetupstatic.com/photos/event/"]')
				.filter({ visible: true });
			await cover.locator("..").locator("..").getByRole("button").click();
			await this.page
				.getByRole("menu")
				.getByText("Replace", { exact: true })
				.click();
		} else {
			await this.page
				.getByRole("button", { name: /imagePlusFilled icon\s*Select/ })
				.click();
		}
		await this.page
			.getByRole("dialog")
			.getByRole("button", { name: "Choose photo", exact: true })
			.waitFor();
	}

	private async source(): Promise<string | undefined> {
		const backgrounds = await this.page
			.locator('div[style*="background-image"]')
			.filter({ visible: true })
			.evaluateAll((elements) =>
				elements
					.filter((element) => !element.closest('[role="dialog"]'))
					.map((element) => (element as HTMLElement).style.backgroundImage),
			);
		const photos = backgrounds.filter((value) => this.identifier(value));
		if (photos.length > 1) throw new Error("Ambiguous Meetup cover photo");
		return photos[0];
	}

	private identifier(background: string): string | undefined {
		return /^url\("https:\/\/secure\.meetupstatic\.com\/photos\/event\/(?:[a-f0-9]+\/)*[a-z0-9]+_([1-9]\d*)\.(?:jpe?g|png)(?:\?[^"\s]*)?"\)$/.exec(
			background,
		)?.[1];
	}
}
