import {
	type CommunitySponsor,
	ScheduledEventError,
} from "@meetup-automation/publication";
import type { Page } from "playwright-core";

/** Links the host's configured group sponsor; unrelated sponsors remain intact. */
export class OcgroupsSponsors {
	constructor(private readonly page: Page) {}

	async matches(sponsor: CommunitySponsor): Promise<boolean> {
		const selected = this.page.locator(
			`sponsors-section input[name$="[group_sponsor_id]"][value="${sponsor.id}"]`,
		);
		if ((await selected.count()) !== 1) return false;
		const name = await selected.getAttribute("name");
		return (
			(await this.page
				.locator(
					`input[name="${name?.replace("[group_sponsor_id]", "[level]")}"]`,
				)
				.inputValue()) === sponsor.level
		);
	}

	async write(sponsor: CommunitySponsor): Promise<void> {
		if (await this.matches(sponsor)) return;
		const section = this.page.locator("sponsors-section");
		await this.page
			.getByRole("button", { name: "Contributors", exact: true })
			.click();
		if (
			await section
				.locator(`input[name$="[group_sponsor_id]"][value="${sponsor.id}"]`)
				.count()
		)
			await section
				.getByRole("button", { name: `Remove ${sponsor.name}`, exact: true })
				.click();
		await section
			.getByPlaceholder("Search sponsors", { exact: true })
			.fill(sponsor.name);
		await section
			.locator("[data-sponsor-search-dropdown]")
			.getByText(sponsor.name, { exact: true })
			.click();
		await section.locator("#sponsor-level-input").fill(sponsor.level);
		await section.getByRole("button", { name: "Add", exact: true }).click();
		await section.locator("#sponsor-level-input").waitFor({ state: "hidden" });
		if (!(await this.matches(sponsor)))
			throw new ScheduledEventError("verification");
	}
}
