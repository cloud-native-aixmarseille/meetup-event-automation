import {
	type CommunitySpeaker,
	ScheduledEventError,
} from "@meetup-automation/publication";
import type { Page } from "playwright-core";

/** Adds exact configured accounts without altering other contributor roles. */
export class OcgroupsSpeakers {
	constructor(private readonly page: Page) {}

	async matches(speakers: readonly CommunitySpeaker[]): Promise<boolean> {
		const ids = await this.page
			.locator(
				'#event-speakers-selector input[name^="speakers["][name$="[user_id]"]',
			)
			.evaluateAll((elements) =>
				elements.map((element) => (element as HTMLInputElement).value),
			);
		return speakers.every(
			(speaker) => ids.filter((id) => id === speaker.userId).length === 1,
		);
	}

	async write(speakers: readonly CommunitySpeaker[]): Promise<void> {
		await this.page
			.getByRole("button", { name: "Contributors", exact: true })
			.click();
		for (const speaker of speakers) {
			if (await this.matches([speaker])) continue;
			await this.add(speaker);
		}
	}

	private async add(speaker: CommunitySpeaker): Promise<void> {
		const selector = this.page.locator("#event-speakers-selector");
		await selector
			.getByRole("button", { name: "Add speaker", exact: true })
			.click();
		const modal = selector.locator("session-speaker-modal");
		await modal.locator("[data-user-search-input]").fill(speaker.username);
		await modal
			.locator("[data-user-search-dropdown]")
			.getByText(`@${speaker.username}`, { exact: true })
			.click();
		await modal
			.getByRole("button", { name: "Add speaker", exact: true })
			.click();
		await modal
			.getByRole("heading", { name: "Add speaker", exact: true })
			.waitFor({ state: "hidden" });
		if (!(await this.matches([speaker])))
			throw new ScheduledEventError("verification");
	}
}
