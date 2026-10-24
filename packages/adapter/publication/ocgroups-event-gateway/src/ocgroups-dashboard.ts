import { ScheduledEventError } from "@meetup-automation/publication";
import type { Page } from "playwright-core";
import type { OcgroupsTarget } from "./ocgroups-target.js";

/** Uses the dashboard controls, including pagination, to open editor fragments in their shell. */
export class OcgroupsDashboard {
	constructor(
		private readonly page: Page,
		private readonly target: OcgroupsTarget,
	) {}

	async select(): Promise<void> {
		await this.page.goto(
			`${this.target.group.origin}/dashboard/group?tab=events`,
			{ waitUntil: "domcontentloaded" },
		);
		await this.selectItem("community", this.target.communityId);
		await this.selectItem("group", this.target.groupId);
		await this.assertTarget();
	}

	async assertTarget(): Promise<void> {
		if (
			new URL(this.page.url()).origin !== this.target.group.origin ||
			(await this.page
				.locator("community-selector")
				.getAttribute("selected-community-id")) !== this.target.communityId ||
			(await this.page
				.locator("group-selector")
				.getAttribute("selected-group-id")) !== this.target.groupId
		)
			throw new ScheduledEventError("verification");
		if (
			(await this.page
				.getByRole("link", { name: "Group public site", exact: true })
				.getAttribute("href")) !==
			`/${this.target.group.community}/group/${this.target.group.group}`
		)
			throw new ScheduledEventError("verification");
	}

	async add(): Promise<void> {
		await this.assertTarget();
		await this.page
			.locator('button[hx-get="/dashboard/group/events/add"]')
			.click();
		await this.page.locator('[data-event-page="add"]').waitFor();
	}

	async open(id: string): Promise<void> {
		await this.select();
		for (let index = 0; index < 100; index++) {
			const button = this.page
				.locator(
					`#upcoming-events-list button[hx-get="/dashboard/group/events/${id}/update"]`,
				)
				.first();
			if (await button.count()) {
				await button.click();
				await this.page.locator("#event-update-page").waitFor();
				return;
			}
			if (!(await this.next())) break;
		}
		throw new ScheduledEventError("verification");
	}

	async candidates(): Promise<readonly string[]> {
		await this.select();
		const ids = new Set<string>();
		for (let index = 0; index < 100; index++) {
			const paths = await this.page
				.locator("#upcoming-events-list button[hx-get]")
				.evaluateAll((elements) =>
					elements.map((element) => element.getAttribute("hx-get")),
				);
			for (const path of paths) {
				const id = path?.match(
					/^\/dashboard\/group\/events\/([0-9a-f-]{36})\/update$/,
				)?.[1];
				if (id) ids.add(id);
			}
			if (!(await this.next())) return [...ids];
		}
		throw new ScheduledEventError("verification");
	}

	private async next(): Promise<boolean> {
		const next = this.page
			.locator("#upcoming-content")
			.getByRole("link", { name: "Next", exact: true });
		if (!(await next.count())) return false;
		const href = await next.getAttribute("href");
		if (!href?.startsWith("/dashboard/group?"))
			throw new ScheduledEventError("verification");
		await next.click();
		await this.page.waitForURL(`${this.target.group.origin}${href}`);
		await this.page.locator("#upcoming-events-list").waitFor();
		return true;
	}

	private async selectItem(
		kind: "community" | "group",
		id: string,
	): Promise<void> {
		const selector = this.page.locator(`${kind}-selector`);
		if ((await selector.getAttribute(`selected-${kind}-id`)) === id) return;
		await this.page.locator(`#${kind}-selector-button`).click();
		await this.page.locator(`#${kind}-option-${id}`).click();
		await this.page
			.locator(`${kind}-selector[selected-${kind}-id="${id}"]`)
			.waitFor();
	}
}
