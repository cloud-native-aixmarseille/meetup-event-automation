import type { Page } from "playwright-core";

export class MeetupVenue {
	constructor(private readonly page: Page) {}

	async select(venue: { name: string; city: string }): Promise<void> {
		// An existing location's heading and address are visible above its map.
		if (await this.matches(venue)) return;
		const selected = this.page.getByRole("heading", {
			name: venue.name,
			exact: true,
		});
		const change = this.page.getByRole("button", {
			name: "Change",
			exact: true,
		});
		if (await change.isVisible()) await change.click();
		const search = this.page.getByPlaceholder("Search or add location...", {
			exact: true,
		});
		await search.fill(`${venue.name} ${venue.city}`);
		const matches = this.page
			.locator("#venue-search-dropdown li")
			.filter({ has: this.page.getByText(venue.name, { exact: true }) })
			.filter({ hasText: venue.city });
		await matches.first().waitFor();
		if ((await matches.count()) !== 1)
			throw new Error("Ambiguous venue selection");
		await matches.click();
		await selected.waitFor();
	}

	async matches(venue: { name: string; city: string }): Promise<boolean> {
		const selected = this.page.getByRole("heading", {
			name: venue.name,
			exact: true,
		});
		return (
			(await selected.isVisible()) &&
			(await selected.locator("../..").innerText()).includes(venue.city)
		);
	}
}
