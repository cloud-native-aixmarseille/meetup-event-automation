import {
	type CommunityEventIdentityPolicy,
	type SavedEventPublication,
	ScheduledEventError,
} from "@meetup-automation/publication";
import type { Page } from "playwright-core";
import type { OcgroupsTarget } from "./ocgroups-target.js";

export class OcgroupsEditorState {
	constructor(
		private readonly page: Page,
		private readonly target: OcgroupsTarget,
		private readonly identities: Pick<CommunityEventIdentityPolicy, "valid">,
	) {}

	async read(): Promise<SavedEventPublication> {
		const root = this.page.locator("#event-update-page");
		await root.waitFor();
		if (
			(await root.getAttribute("data-event-canceled")) !== "false" ||
			(await root.getAttribute("data-event-past")) !== "false" ||
			(await root.getAttribute("data-can-manage-events")) !== "true" ||
			(await root.getAttribute("data-community-name")) !==
				this.target.group.community ||
			(await root.getAttribute("data-group-slug")) !== this.target.group.group
		)
			throw new ScheduledEventError("verification");
		const path = await this.page
			.locator("#update-event-button")
			.getAttribute("hx-put");
		const id = path?.match(
			/^\/dashboard\/group\/events\/([0-9a-f-]{36})\/update$/,
		)?.[1];
		const publicPath = await root.getAttribute("data-event-public-url");
		const identity = {
			id: id ?? "",
			reviewUrl: `${this.target.group.origin}${path}`,
			publicUrl: `${this.target.group.origin}${publicPath}`,
		};
		if (!this.identities.valid(identity))
			throw new ScheduledEventError("verification");
		const enabled = await root.getAttribute("data-event-public-url-enabled");
		const publish = this.page.locator("#publish-event-button");
		if ((await publish.getAttribute("data-has-related-events")) !== "false")
			throw new ScheduledEventError("verification");
		if (enabled === "false") return { identity, status: "draft" };
		if (
			enabled !== "true" ||
			!(await publish.isDisabled()) ||
			(await publish.getAttribute("title")) !==
				"This event is already published."
		)
			throw new ScheduledEventError("verification");
		return { identity, status: "published" };
	}
}
