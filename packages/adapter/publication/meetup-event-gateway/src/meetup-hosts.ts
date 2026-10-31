import type { MeetupGroupUrl } from "@meetup-automation/publication";
import type { Page } from "playwright-core";
import type { MeetupLeadership } from "./meetup-leadership.js";

/** Adds every group leader without removing organizer-selected event hosts. */
export class MeetupHosts {
	constructor(
		private readonly page: Page,
		private readonly leadership: Pick<MeetupLeadership, "members">,
	) {}
	async select(group: MeetupGroupUrl): Promise<readonly string[]> {
		const leaders = await this.leadership.members(group);
		const selected = await this.selected();
		for (const name of leaders) {
			if (selected.includes(name)) continue;
			await this.page
				.getByPlaceholder("Search hosts...", { exact: true })
				.fill(name);
			const candidate = this.page
				.locator("#host-search-dropdown li")
				.filter({ has: this.page.getByText(name, { exact: true }) });
			await candidate.first().waitFor();
			if ((await candidate.count()) !== 1)
				throw new Error("Ambiguous Meetup host selection");
			await candidate.click();
			await this.page
				.getByRole("button", { name: `Remove ${name} as host`, exact: true })
				.waitFor();
		}
		return [...new Set([...selected, ...leaders])];
	}
	async matches(
		group: MeetupGroupUrl,
		expected: readonly string[] | undefined,
	): Promise<boolean> {
		const selected = await this.selected();
		const required = expected ?? (await this.leadership.members(group));
		return required.every((name) => selected.includes(name));
	}
	private async selected(): Promise<readonly string[]> {
		const hosts = this.page.locator("#hosts");
		await hosts.waitFor();
		// The chip group follows the host search; suggested members have their own group.
		return (
			await hosts
				.locator(":scope > div > div:nth-child(2) > div > div > p")
				.allTextContents()
		).map((name) => name.trim());
	}
}
