import type {
	MeetupEventUrl,
	MeetupPublicationEvent,
} from "@meetup-automation/publication";
import type { Page } from "playwright-core";
import type { MeetupBrowserRoutes } from "./meetup-browser-routes.js";
import type {
	MeetupCalendar,
	MeetupCalendarArguments,
} from "./meetup-calendar.js";
import type { MeetupCover } from "./meetup-cover.js";
import type { MeetupVenue, MeetupVenueArguments } from "./meetup-venue.js";
import type { SavedMeetupEvent } from "./saved-meetup-event.js";

export interface MeetupEventVerificationCollaborators {
	readonly createCover: (page: Page) => Pick<MeetupCover, "matches">;
	readonly meetupBrowserRoutes: Pick<
		MeetupBrowserRoutes,
		"edit" | "matchesEditor"
	>;
	readonly createMeetupVenue: (...args: MeetupVenueArguments) => MeetupVenue;
	readonly createMeetupCalendar: (
		...args: MeetupCalendarArguments
	) => MeetupCalendar;
}

export class MeetupEventVerification {
	constructor(
		private readonly collaborators: MeetupEventVerificationCollaborators,
		private readonly page: Page,
	) {}

	async verify(
		event: MeetupPublicationEvent,
		url: MeetupEventUrl,
	): Promise<{
		matches: boolean;
		status: SavedMeetupEvent["status"];
	}> {
		const editorUrl = this.collaborators.meetupBrowserRoutes.edit(url);
		await this.page.goto(editorUrl, { waitUntil: "domcontentloaded" });
		if (
			!this.collaborators.meetupBrowserRoutes.matchesEditor(
				this.page.url(),
				editorUrl,
			)
		)
			throw new Error("The saved event editor is unavailable");
		const status = await this.status();
		const announcement = this.page.getByTestId("announcement-close-btn");
		if (await announcement.isVisible()) await announcement.click();
		await this.ready();
		const title = await this.page.getByTestId("event-name-input").inputValue();
		const description = await this.page
			.getByTestId("event-description-editor")
			.locator('[contenteditable="true"]:visible')
			.innerText();
		// Drafts have no public projection. Reopen the editor to read persisted
		// fields and distinguish drafts from organizer-published events.
		const matches =
			title === event.title &&
			this.normalize(description) === this.normalize(event.description) &&
			(await this.collaborators
				.createMeetupVenue(this.page)
				.matches(event.venue)) &&
			(await this.collaborators
				.createMeetupCalendar(this.page)
				.matches(event.date, event.startTime, event.endTime)) &&
			(await this.collaborators
				.createCover(this.page)
				.matches(event.cover, url.group));
		return { matches, status };
	}

	async ready(): Promise<void> {
		// The saved editor renders enabled, empty controls before loading event data.
		// Persisted Meetup events require a title; visibility alone is not readiness.
		await this.page.waitForFunction(() =>
			Boolean(
				document
					.querySelector<HTMLInputElement>('[data-testid="event-name-input"]')
					?.value.trim(),
			),
		);
	}

	async status(): Promise<SavedMeetupEvent["status"]> {
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

	private normalize(value: string): string {
		return value.replace(/\s+/g, " ").trim();
	}
}
export type MeetupEventVerificationArguments =
	ConstructorParameters<typeof MeetupEventVerification> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
