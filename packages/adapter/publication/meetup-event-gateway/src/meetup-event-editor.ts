import {
	MeetupEventUrl,
	MeetupGroupUrl,
	type MeetupPublicationEvent,
	ScheduledEventError,
} from "@meetup-automation/publication";
import type { Page } from "playwright-core";
import type { MeetupBrowserRoutes } from "./meetup-browser-routes.js";
import type {
	MeetupCalendar,
	MeetupCalendarArguments,
} from "./meetup-calendar.js";
import type { MeetupCover } from "./meetup-cover.js";
import type {
	MeetupEventVerification,
	MeetupEventVerificationArguments,
} from "./meetup-event-verification.js";
import type { MeetupVenue, MeetupVenueArguments } from "./meetup-venue.js";
import type { SavedMeetupEvent } from "./saved-meetup-event.js";

export interface MeetupEventEditorCollaborators {
	readonly createCover: (page: Page) => Pick<MeetupCover, "apply">;
	readonly meetupBrowserRoutes: Pick<
		MeetupBrowserRoutes,
		"eventLocation" | "edit" | "schedule" | "matchesEditor"
	>;
	readonly createMeetupEventVerification: (
		...args: MeetupEventVerificationArguments
	) => MeetupEventVerification;
	readonly createMeetupCalendar: (
		...args: MeetupCalendarArguments
	) => MeetupCalendar;
	readonly createMeetupVenue: (...args: MeetupVenueArguments) => MeetupVenue;
}

export class MeetupEventEditor {
	private readonly group: MeetupGroupUrl;

	constructor(
		private readonly collaborators: MeetupEventEditorCollaborators,
		private readonly page: Page,
		groupUrl: string,
	) {
		const group = MeetupGroupUrl.parse(groupUrl);
		if (!group) throw new ScheduledEventError("editor");
		this.group = group;
		page.setDefaultTimeout(15_000);
		page.setDefaultNavigationTimeout(30_000);
	}

	async inspect(reference: string): Promise<SavedMeetupEvent> {
		const identity = MeetupEventUrl.parse(reference, this.group);
		if (!identity) throw new ScheduledEventError("link");
		try {
			const editorUrl = this.collaborators.meetupBrowserRoutes.edit(identity);
			await this.page.goto(editorUrl, { waitUntil: "domcontentloaded" });
			if (
				!this.collaborators.meetupBrowserRoutes.matchesEditor(
					this.page.url(),
					editorUrl,
				)
			)
				throw new ScheduledEventError("verification");
			const status = await this.collaborators
				.createMeetupEventVerification(this.page)
				.status();
			return { url: identity.value, status };
		} catch {
			throw new ScheduledEventError("verification");
		}
	}

	async save(
		event: MeetupPublicationEvent,
		url: string | undefined,
		beforeSubmit: () => Promise<void>,
		onSaved: (url: string) => Promise<void>,
	): Promise<SavedMeetupEvent> {
		const identity = MeetupEventUrl.parse(url, this.group);
		if (url && !identity) throw new ScheduledEventError("editor");
		const verification = this.collaborators.createMeetupEventVerification(
			this.page,
		);
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
		await this.collaborators
			.createCover(this.page)
			.apply(event.cover, this.group, beforeSubmit);
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
		status: SavedMeetupEvent["status"],
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
					this.collaborators.meetupBrowserRoutes.eventLocation(
						value,
						this.group,
					) !== undefined,
				{ waitUntil: "domcontentloaded" },
			);
			const saved = this.collaborators.meetupBrowserRoutes.eventLocation(
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
		event: MeetupPublicationEvent,
		url: MeetupEventUrl | undefined,
	): Promise<SavedMeetupEvent["status"]> {
		const editorUrl = url
			? this.collaborators.meetupBrowserRoutes.edit(url)
			: this.collaborators.meetupBrowserRoutes.schedule(this.group);
		await this.page.goto(editorUrl, { waitUntil: "domcontentloaded" });
		if (
			!this.collaborators.meetupBrowserRoutes.matchesEditor(
				this.page.url(),
				editorUrl,
			)
		)
			throw new Error("The organizer editor is unavailable");
		const verification = this.collaborators.createMeetupEventVerification(
			this.page,
		);
		const status = await verification.status();
		if (url) await verification.ready();
		const announcement = this.page.getByTestId("announcement-close-btn");
		if (await announcement.isVisible()) await announcement.click();
		if (!url) await this.startNewDraft();
		await this.page.getByTestId("event-name-input").fill(event.title);
		await this.collaborators
			.createMeetupCalendar(this.page)
			.fill(event.date, event.startTime, event.endTime);
		await this.page
			.getByTestId("event-description-editor")
			.locator('[contenteditable="true"]:visible')
			.fill(event.description);
		await this.collaborators.createMeetupVenue(this.page).select(event.venue);
		return status;
	}

	private async startNewDraft(): Promise<void> {
		const scratch = this.page
			.getByTestId("event-start-from-scratch-btn")
			.filter({ visible: true });
		const calendar = this.page.getByRole("button", {
			name: "Open date picker",
			exact: true,
		});
		// The template dialog hides the form from the accessibility tree.
		await scratch.or(calendar).first().waitFor();
		if (await scratch.isVisible()) {
			await scratch.click();
			await scratch.waitFor({ state: "hidden" });
		}
		const announcement = this.page
			.getByTestId("announcement-close-btn")
			.filter({ visible: true });
		for (let notice = 0; notice < 5; notice++) {
			await announcement.or(calendar).first().waitFor();
			if (!(await announcement.isVisible())) break;
			// A dismissal can reveal another notice with the same test ID.
			const current = await announcement.elementHandle();
			await announcement.click();
			await current?.waitForElementState("hidden");
		}
		await calendar.waitFor();
	}
}
export type MeetupEventEditorArguments =
	ConstructorParameters<typeof MeetupEventEditor> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
