import {
	MeetupEventUrl,
	MeetupGroupUrl,
	type SavedScheduledEvent,
	type ScheduledEvent,
	ScheduledEventError,
} from "@meetup-automation/publication";
import type { Page } from "playwright-core";
import { MeetupCalendar } from "./meetup-calendar.js";
import { MeetupEventVerification } from "./meetup-event-verification.js";
import { MeetupVenue } from "./meetup-venue.js";
import { MeetupBrowserRoutes } from "./meetup-browser-routes.js";

export class MeetupEventEditor {
	private readonly group: MeetupGroupUrl;

	constructor(
		private readonly page: Page,
		groupUrl: string,
	) {
		const group = MeetupGroupUrl.parse(groupUrl);
		if (!group) throw new ScheduledEventError("editor");
		this.group = group;
		page.setDefaultTimeout(15_000);
		page.setDefaultNavigationTimeout(30_000);
	}

	async save(
		event: ScheduledEvent,
		url: string | undefined,
		beforeSubmit: () => Promise<void>,
		onSaved: (url: string) => Promise<void>,
	): Promise<SavedScheduledEvent> {
		const identity = MeetupEventUrl.parse(url, this.group);
		if (url && !identity) throw new ScheduledEventError("editor");
		const verification = new MeetupEventVerification(this.page);
		const existing = identity
			? await verification.verify(event, identity).catch(() => {
					throw new ScheduledEventError("editor");
				})
			: undefined;
		if (identity && existing?.matches) {
			await onSaved(identity.value);
			return { url: identity.value, status: existing.status };
		}
		const status = await this.prepare(event, identity).catch(() => {
			throw new ScheduledEventError("editor");
		});
		if (status !== (existing?.status ?? "draft"))
			throw new ScheduledEventError("editor");
		// Keep concurrency and durable-reservation failures separate from browser errors.
		await beforeSubmit();
		const savedUrl = await this.submit(identity, status);
		await onSaved(savedUrl.value);
		const saved = await verification
			.verify(event, savedUrl)
			.catch(() => undefined);
		if (!saved?.matches || saved.status !== status)
			throw new ScheduledEventError("verification");
		return { url: savedUrl.value, status: saved.status };
	}

	private async submit(
		url: MeetupEventUrl | undefined,
		status: SavedScheduledEvent["status"],
	): Promise<MeetupEventUrl> {
		try {
			// Preview saves a draft and opens its identity URL. Save as draft instead
			// redirects to the drafts list, losing the identity needed for safe retries.
			const submit =
				status === "draft"
					? this.page.getByTestId("event-preview-btn").filter({ visible: true })
					: this.page
							.getByRole("button", { name: "Save changes", exact: true })
							.filter({ visible: true });
			await submit.click();
			await this.page.waitForURL(
				(value) =>
					MeetupBrowserRoutes.eventLocation(value, this.group) !== undefined,
				{ waitUntil: "domcontentloaded" },
			);
			const saved = MeetupBrowserRoutes.eventLocation(
				new URL(this.page.url()),
				this.group,
			);
			if (!saved || (url && saved.value !== url.value))
				throw new Error("Unexpected event identity");
			return saved;
		} catch {
			// Never retry a create click: the server may have accepted it.
			throw new ScheduledEventError("uncertain");
		}
	}

	private async prepare(
		event: ScheduledEvent,
		url: MeetupEventUrl | undefined,
	): Promise<SavedScheduledEvent["status"]> {
		const editorUrl = url
			? MeetupBrowserRoutes.edit(url)
			: MeetupBrowserRoutes.schedule(this.group);
		await this.page.goto(editorUrl, { waitUntil: "domcontentloaded" });
		if (!MeetupBrowserRoutes.matchesEditor(this.page.url(), editorUrl))
			throw new Error("The organizer editor is unavailable");
		const status = await new MeetupEventVerification(this.page).status();
		const announcement = this.page.getByTestId("announcement-close-btn");
		if (await announcement.isVisible()) await announcement.click();
		await this.page.getByTestId("event-name-input").fill(event.title);
		await new MeetupCalendar(this.page).fill(
			event.date,
			event.startTime,
			event.endTime,
		);
		await this.page
			.getByTestId("event-description-editor")
			.locator('[contenteditable="true"]:visible')
			.fill(event.description);
		await new MeetupVenue(this.page).select(event.venue);
		return status;
	}
}
