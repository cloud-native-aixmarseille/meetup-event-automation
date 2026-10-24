import {
	type CommunityEvent,
	type EventPublicationIdentity,
	type SavedEventPublication,
	ScheduledEventError,
} from "@meetup-automation/publication";
import type { Page } from "playwright-core";
import type { OcgroupsDashboard } from "./ocgroups-dashboard.js";
import type { OcgroupsEditorState } from "./ocgroups-editor-state.js";
import type { OcgroupsEventFields } from "./ocgroups-event-fields.js";
import type { OcgroupsRegistration } from "./ocgroups-registration.js";

export class OcgroupsEventPublisher {
	constructor(
		private readonly page: Page,
		private readonly origin: string,
		private readonly dashboard: Pick<
			OcgroupsDashboard,
			"open" | "assertTarget"
		>,
		private readonly state: Pick<OcgroupsEditorState, "read">,
		private readonly fields: Pick<OcgroupsEventFields, "matches">,
		private readonly registration: Pick<OcgroupsRegistration, "verify">,
	) {}

	async publish(
		event: CommunityEvent,
		identity: EventPublicationIdentity,
		beforePublish: () => Promise<void>,
	): Promise<SavedEventPublication> {
		await this.dashboard.open(identity.id);
		const saved = await this.state.read();
		if (
			saved.identity.id !== identity.id ||
			saved.identity.publicUrl !== identity.publicUrl ||
			!(await this.fields.matches(event))
		)
			throw new ScheduledEventError("verification");
		if (saved.status === "published") return saved;
		await this.registration.verify(event.registration);
		const button = this.page.locator("#publish-event-button");
		const path = `/dashboard/group/events/${identity.id}/publish`;
		if (
			(await button.getAttribute("data-action-url")) !== path ||
			(await button.isDisabled())
		)
			throw new ScheduledEventError("verification");
		await button.click();
		const modal = this.page.locator(".swal2-popup");
		await modal.waitFor();
		if (
			(await modal.locator(".swal2-html-container").textContent())?.trim() !==
			"Are you sure you wish to publish this event?"
		)
			throw new ScheduledEventError("verification");
		await this.dashboard.assertTarget();
		await beforePublish();
		const response = this.page.waitForResponse(
			(item) =>
				item.url() === `${this.origin}${path}?return=editor` &&
				item.request().method() === "PUT",
		);
		const [published] = await Promise.all([
			response,
			modal.getByRole("button", { name: "Yes", exact: true }).click(),
		]);
		if (!published.ok()) throw new ScheduledEventError("uncertain");
		await this.dashboard.open(identity.id);
		const verified = await this.state.read();
		if (
			verified.status !== "published" ||
			verified.identity.id !== identity.id ||
			!(await this.fields.matches(event))
		)
			throw new ScheduledEventError("verification");
		return verified;
	}
}
