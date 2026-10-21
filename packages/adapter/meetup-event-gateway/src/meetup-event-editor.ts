import {
	type SavedScheduledEvent,
	type ScheduledEvent,
	ScheduledEventError,
} from "@meetup-automation/publication";
import type { Page } from "playwright-core";
import { MeetupCalendar } from "./meetup-calendar.js";
import { MeetupEventVerification } from "./meetup-event-verification.js";
import { MeetupVenue } from "./meetup-venue.js";

export class MeetupEventEditor {
	constructor(
		private readonly page: Page,
		private readonly groupUrl: string,
	) {
		if (!/^https:\/\/www\.meetup\.com\/[a-z0-9-]+\/$/.test(groupUrl))
			throw new ScheduledEventError("editor");
		page.setDefaultTimeout(15_000);
		page.setDefaultNavigationTimeout(30_000);
	}

	async save(
		event: ScheduledEvent,
		url: string | undefined,
		beforeSubmit: () => Promise<void>,
		onSaved: (url: string) => Promise<void>,
	): Promise<SavedScheduledEvent> {
		if (url && !this.eventUrl(url)) throw new ScheduledEventError("editor");
		const identity = url ? this.eventUrl(url) : undefined;
		const verification = new MeetupEventVerification(this.page);
		const existing = identity
			? await verification.verify(event, identity).catch(() => {
					throw new ScheduledEventError("editor");
				})
			: undefined;
		if (identity && existing?.matches) {
			await onSaved(identity);
			return { url: identity, status: existing.status };
		}
		const status = await this.prepare(event, identity).catch(() => {
			throw new ScheduledEventError("editor");
		});
		if (status !== (existing?.status ?? "draft"))
			throw new ScheduledEventError("editor");
		// Keep concurrency and durable-reservation failures separate from browser errors.
		await beforeSubmit();
		const savedUrl = await this.submit(identity, status);
		await onSaved(savedUrl);
		const saved = await verification
			.verify(event, savedUrl)
			.catch(() => undefined);
		if (!saved?.matches || saved.status !== status)
			throw new ScheduledEventError("verification");
		return { url: savedUrl, status: saved.status };
	}

	private async submit(
		url: string | undefined,
		status: SavedScheduledEvent["status"],
	): Promise<string> {
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
				(value) => this.eventUrl(value.href) !== undefined,
				{ waitUntil: "domcontentloaded" },
			);
			const saved = this.eventUrl(this.page.url());
			if (!saved || (url && saved !== url))
				throw new Error("Unexpected event identity");
			return saved;
		} catch {
			// Never retry a create click: the server may have accepted it.
			throw new ScheduledEventError("uncertain");
		}
	}

	private async prepare(
		event: ScheduledEvent,
		url: string | undefined,
	): Promise<SavedScheduledEvent["status"]> {
		const editorUrl = url ? `${url}edit/` : `${this.groupUrl}schedule/`;
		await this.page.goto(editorUrl, { waitUntil: "domcontentloaded" });
		if (this.page.url().replace(/\/$/, "") !== editorUrl.replace(/\/$/, ""))
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

	private eventUrl(value: string): string | undefined {
		const url = new URL(value);
		const prefix = `${this.groupUrl}events/`;
		const normalized = `${url.origin}${url.pathname}`;
		return normalized.startsWith(prefix) &&
			/^[1-9]\d*\/?$/.test(normalized.slice(prefix.length))
			? `${normalized.replace(/\/$/, "")}/`
			: undefined;
	}
}
