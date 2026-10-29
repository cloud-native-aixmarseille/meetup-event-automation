import {
	type PublicationWriteGuard,
	type CommunityEvent,
	type EventPublicationIdentity,
	type SavedEventPublication,
	ScheduledEventError,
} from "@meetup-automation/publication";
import type { Page } from "playwright-core";
import type { OcgroupsDashboard } from "./ocgroups-dashboard.js";
import type { OcgroupsEditorLocation } from "./ocgroups-editor-location.js";
import type { OcgroupsEditorState } from "./ocgroups-editor-state.js";
import type { OcgroupsEventContent } from "./ocgroups-event-content.js";
import type { OcgroupsRegistration } from "./ocgroups-registration.js";

export class OcgroupsEventEditor {
	constructor(
		private readonly page: Page,
		private readonly origin: string,
		private readonly dashboard: Pick<
			OcgroupsDashboard,
			"select" | "open" | "add" | "assertTarget" | "candidates"
		>,
		private readonly state: Pick<OcgroupsEditorState, "read">,
		private readonly fields: Pick<OcgroupsEventContent, "matches" | "write">,
		private readonly registration: Pick<
			OcgroupsRegistration,
			"create" | "verify"
		>,
		private readonly location: Pick<OcgroupsEditorLocation, "decode">,
	) {}

	async inspect(reference: string): Promise<SavedEventPublication> {
		const editorPrefix = `${this.origin}/dashboard/group/events/`;
		const id = reference.startsWith(editorPrefix)
			? reference
					.slice(editorPrefix.length)
					.match(/^([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})\/update$/)?.[1]
			: undefined;
		if (id) {
			await this.dashboard.open(id);
			const saved = await this.state.read();
			if (saved.identity.id !== id)
				throw new ScheduledEventError("verification");
			return saved;
		}
		for (const id of await this.dashboard.candidates()) {
			await this.dashboard.open(id);
			const url = await this.page
				.locator("#event-update-page")
				.getAttribute("data-event-public-url");
			if (`${this.origin}${url}` === reference) return this.state.read();
		}
		throw new ScheduledEventError("link");
	}

	async save(
		event: CommunityEvent,
		identity: EventPublicationIdentity | undefined,
		beforeSubmit: PublicationWriteGuard,
		onSaved: (identity: EventPublicationIdentity) => Promise<void>,
	): Promise<SavedEventPublication> {
		let previous: SavedEventPublication | undefined;
		if (identity) {
			await this.dashboard.open(identity.id);
			previous = await this.state.read();
			if (previous.identity.id !== identity.id)
				throw new ScheduledEventError("verification");
			if (previous.status === "draft")
				await this.registration.verify(event.registration);
			if (await this.fields.matches(event)) return previous;
		} else {
			await this.dashboard.select();
			await this.dashboard.add();
			await this.registration.create(event.registration);
		}
		await this.dashboard.assertTarget();
		await this.fields.write(event, beforeSubmit);
		if (!(await this.fields.matches(event)))
			throw new ScheduledEventError("verification");
		if (!previous || previous.status === "draft")
			await this.registration.verify(event.registration);
		await this.dashboard.assertTarget();
		await beforeSubmit("event");
		const savedIdentity = await this.submit(identity);
		await onSaved(savedIdentity);
		await this.dashboard.open(savedIdentity.id);
		const saved = await this.state.read();
		if (
			saved.identity.id !== savedIdentity.id ||
			saved.status !== (previous?.status ?? "draft") ||
			!(await this.fields.matches(event))
		)
			throw new ScheduledEventError("verification");
		if (saved.status === "draft")
			await this.registration.verify(event.registration);
		return saved;
	}

	private async submit(
		identity: EventPublicationIdentity | undefined,
	): Promise<EventPublicationIdentity> {
		const path = identity
			? `/dashboard/group/events/${identity.id}/update`
			: "/dashboard/group/events/add";
		const button = this.page.locator(
			identity ? "#update-event-button" : "#add-event-button",
		);
		if ((await button.getAttribute(identity ? "hx-put" : "hx-post")) !== path)
			throw new ScheduledEventError("verification");
		const response = this.page.waitForResponse(
			(item) =>
				item.url() === `${this.origin}${path}` &&
				item.request().method() === (identity ? "PUT" : "POST"),
		);
		const [saved] = await Promise.all([response, button.click()]);
		if (!saved.ok()) throw new ScheduledEventError("uncertain");
		const observed = this.location.decode(
			await saved.headerValue("hx-location"),
		);
		if (identity && identity.id !== observed.id)
			throw new ScheduledEventError("verification");
		return observed;
	}
}
