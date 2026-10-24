import {
	type CommunityRegistration,
	ScheduledEventError,
} from "@meetup-automation/publication";
import type { Page } from "playwright-core";

export class OcgroupsRegistration {
	constructor(private readonly page: Page) {}

	async create(value: CommunityRegistration): Promise<void> {
		await this.page.locator('button[data-section="details"]').click();
		await this.page.locator("#toggle_test_event").setChecked(false);
		await this.page
			.locator("#toggle_waitlist_enabled")
			.setChecked(value.waitlist);
		await this.page
			.locator("#toggle_attendee_approval_required")
			.setChecked(value.approvalRequired);
		await this.page.locator('button[data-section="date-venue"]').click();
		await this.page.locator("#recurrence_pattern").selectOption("just-once");
		await this.page.locator("#registration_starts_at").fill("");
		await this.page.locator("#registration_ends_at").fill("");
		await this.page
			.locator("#toggle_event_reminder_enabled")
			.setChecked(value.reminder);
		await this.page.locator('button[data-section="payments"]').click();
		await this.page.locator('[data-ticketing-action="edit-ticket"]').click();
		await this.page.locator("#ticket-title-draft").fill("General Admission");
		await this.page.locator("#ticket-seats-draft").fill(String(value.capacity));
		await this.page
			.locator("#ticket-availability-draft")
			.selectOption("public");
		await this.page.locator('[data-ticket-field="active"]').setChecked(true);
		await this.page.locator('[data-ticket-window-field="amount"]').fill("0");
		await this.page.locator('[data-ticketing-action="save-ticket"]').click();
	}

	async verify(value: CommunityRegistration): Promise<void> {
		const expected: Readonly<Record<string, string>> = {
			waitlist_enabled: String(value.waitlist),
			attendee_approval_required: String(value.approvalRequired),
			event_reminder_enabled: String(value.reminder),
			test_event: "false",
			meeting_requested: "false",
			registration_starts_at: "",
			registration_ends_at: "",
			"ticket_types[0][active]": "true",
			"ticket_types[0][availability]": "public",
			"ticket_types[0][seats_total]": String(value.capacity),
			"ticket_types[0][price_windows][0][amount_minor]": "0",
		};
		for (const [name, text] of Object.entries(expected)) {
			if ((await this.page.locator(`[name="${name}"]`).inputValue()) !== text)
				throw new ScheduledEventError("verification");
		}
		if (
			await this.page
				.locator(
					'[name="ticket_types[1][active]"], [name="ticket_types[0][price_windows][1][amount_minor]"], input[name^="ticket_types"][name$="[starts_at]"], input[name^="ticket_types"][name$="[ends_at]"]',
				)
				.count()
		)
			throw new ScheduledEventError("verification");
	}
}
