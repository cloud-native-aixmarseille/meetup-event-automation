import {
	MeetupEventUrl,
	type MeetupGroupUrl,
	ScheduledEventError,
} from "@meetup-automation/publication";
import type { Page } from "playwright-core";
import type { AttendeeMessages } from "./i18n/attendee-messages.js";

/** The only eligible audience is the selected event's recorded attendees. */
export class MeetupAttendeeMessage {
	constructor(
		private readonly messages: Pick<AttendeeMessages, "t">,
		private readonly page: Page,
		private readonly group: MeetupGroupUrl,
	) {}

	async send(
		eventUrl: string,
		pdfUrl: string,
		beforeSend: () => Promise<void>,
	): Promise<void> {
		const event = MeetupEventUrl.parse(eventUrl, this.group);
		if (!event) throw new ScheduledEventError("link");
		const destination = new URL("messages/send/", this.group.value);
		destination.searchParams.set("eventId", event.id);
		this.page.setDefaultTimeout(15_000);
		this.page.setDefaultNavigationTimeout(30_000);
		await this.page.goto(destination.href, { waitUntil: "domcontentloaded" });
		if (this.page.url() !== destination.href)
			throw new ScheduledEventError("verification");
		await this.selectAudience();
		await this.page
			.locator("input#subject")
			.fill(this.messages.t("slides.subject"));
		await this.page
			.locator('.toastui-editor .ProseMirror[contenteditable="true"]:visible')
			.fill(this.messages.t("slides.body", { url: pdfUrl }));
		await beforeSend();
		await this.page
			.getByRole("button", { name: "Send message", exact: true })
			.click();
		await this.page
			.getByText("Email has been successfully sent!", { exact: true })
			.waitFor();
	}

	private async selectAudience(): Promise<void> {
		await this.page
			.getByRole("radio", {
				name: /^Members based on RSVP status to a given event/,
			})
			.check();
		const attended = this.page.getByRole("checkbox", {
			name: "Members who went to this event",
			exact: true,
		});
		await attended.waitFor();
		const options = this.page.locator(
			'[role="checkbox"][id^="selection-option-"]',
		);
		for (const option of await options.all()) {
			await option.setChecked(
				(await option.getAttribute("id")) === "selection-option-ATTENDED",
			);
		}
		if (
			!(await attended.isChecked()) ||
			(await options
				.and(this.page.locator('[aria-checked="true"]'))
				.count()) !== 1
		)
			throw new ScheduledEventError("verification");
	}
}
