import type {
	SavedScheduledEvent,
	ScheduledEvent,
} from "@meetup-automation/publication";
import type { Page } from "playwright-core";
import { MeetupCalendar } from "./meetup-calendar.js";
import { MeetupVenue } from "./meetup-venue.js";

export class MeetupEventVerification {
	constructor(private readonly page: Page) {}

	async verify(
		event: ScheduledEvent,
		url: string,
	): Promise<{
		matches: boolean;
		status: SavedScheduledEvent["status"];
	}> {
		const editorUrl = `${url}edit/`;
		await this.page.goto(editorUrl, { waitUntil: "domcontentloaded" });
		if (this.page.url().replace(/\/$/, "") !== editorUrl.replace(/\/$/, ""))
			throw new Error("The saved event editor is unavailable");
		const status = await this.status();
		const announcement = this.page.getByTestId("announcement-close-btn");
		if (await announcement.isVisible()) await announcement.click();
		const title = await this.page.getByTestId("event-name-input").inputValue();
		const description = await this.page
			.getByTestId("event-description-editor")
			.locator('[contenteditable="true"]:visible')
			.innerText();
		// Drafts have no public projection. Reopen the editor to read persisted
		// fields and distinguish drafts from organizer-published events.
		const matches =
			title === event.title &&
			MeetupEventVerification.normalize(description) ===
				MeetupEventVerification.normalize(event.description) &&
			(await new MeetupVenue(this.page).matches(event.venue)) &&
			(await new MeetupCalendar(this.page).matches(
				event.date,
				event.startTime,
				event.endTime,
			));
		return { matches, status };
	}

	async status(): Promise<SavedScheduledEvent["status"]> {
		const draft = this.page
			.getByTestId("event-save-draft-btn")
			.filter({ visible: true });
		const published = this.page
			.getByRole("button", { name: "Save changes", exact: true })
			.filter({ visible: true });
		await draft.or(published).first().waitFor();
		const isDraft = await draft.isVisible();
		const isPublished = await published.isVisible();
		if (isDraft === isPublished)
			throw new Error("Unknown event publication status");
		return isDraft ? "draft" : "published";
	}

	private static normalize(value: string): string {
		return value.replace(/\s+/g, " ").trim();
	}
}
