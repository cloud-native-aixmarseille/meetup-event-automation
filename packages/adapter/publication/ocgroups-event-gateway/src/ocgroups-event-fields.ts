import type { CommunityEvent } from "@meetup-automation/publication";
import type { Page } from "playwright-core";

/** Only these fields are managed on existing events. Other form state is preserved. */
export class OcgroupsEventFields {
	constructor(private readonly page: Page) {}

	async matches(event: CommunityEvent): Promise<boolean> {
		for (const [name, expected] of Object.entries(this.values(event))) {
			if (
				(await this.page
					.locator(`:is(input, textarea, select)[name="${name}"]`)
					.inputValue()) !== expected
			)
				return false;
		}
		return true;
	}

	async write(event: CommunityEvent): Promise<void> {
		await this.page.locator('button[data-section="details"]').click();
		await this.page.locator("#name").fill(event.title);
		await this.page.locator("#kind_id").selectOption("in-person");
		await this.page.locator("#category_id").selectOption(event.categoryId);
		await this.page.locator("#meetup_url").fill(event.meetupUrl);
		const editor = this.page.locator("markdown-editor#description .CodeMirror");
		await editor.click();
		await this.page.keyboard.press("ControlOrMeta+A");
		await this.page.keyboard.insertText(event.description);
		await this.page.locator('button[data-section="date-venue"]').click();
		if (
			(await this.page.locator('input[name="timezone"]').inputValue()) !==
			event.timeZone
		) {
			await this.page.locator("#timezone-selector-button").click();
			await this.page.locator("#timezone-search-input").fill(event.timeZone);
			await this.page
				.getByRole("option", { name: event.timeZone, exact: true })
				.click();
		}
		for (const [name, value] of Object.entries(this.values(event))) {
			if (
				[
					"name",
					"kind_id",
					"category_id",
					"description",
					"timezone",
					"meetup_url",
				].includes(name)
			)
				continue;
			await this.page.locator(`[name="${name}"]`).fill(value);
		}
	}

	private values(event: CommunityEvent): Readonly<Record<string, string>> {
		return {
			name: event.title,
			description: event.description,
			kind_id: "in-person",
			category_id: event.categoryId,
			meetup_url: event.meetupUrl,
			timezone: event.timeZone,
			starts_at: `${event.date}T${event.startTime}`,
			ends_at: `${event.date}T${event.endTime}`,
			venue_name: event.venue.name,
			venue_address: event.venue.address,
			venue_city: event.venue.city,
			venue_zip_code: event.venue.zipCode,
			venue_state_name: event.venue.state,
			venue_country_name: event.venue.country,
			venue_country_code: event.venue.countryCode,
			venue_state_code: "",
			latitude: "",
			longitude: "",
		};
	}
}
