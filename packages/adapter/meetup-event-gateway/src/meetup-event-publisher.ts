import {
	type SavedScheduledEvent,
	type ScheduledEvent,
	ScheduledEventError,
} from "@meetup-automation/publication";
import type { Page } from "playwright-core";
import { MeetupEventVerification } from "./meetup-event-verification.js";

export class MeetupEventPublisher {
	constructor(
		private readonly page: Page,
		private readonly groupUrl: string,
	) {
		page.setDefaultTimeout(15_000);
		page.setDefaultNavigationTimeout(30_000);
	}
	async publish(
		event: ScheduledEvent,
		url: string,
		beforePublish: () => Promise<void>,
	): Promise<SavedScheduledEvent> {
		if (
			!/^https:\/\/www\.meetup\.com\/[a-z0-9-]+\/$/.test(this.groupUrl) ||
			!url.startsWith(`${this.groupUrl}events/`) ||
			!/^[1-9]\d*\/$/.test(url.slice(`${this.groupUrl}events/`.length))
		)
			throw new ScheduledEventError("editor");
		const verification = new MeetupEventVerification(this.page);
		const current = await verification.verify(event, url).catch(() => {
			throw new ScheduledEventError("verification");
		});
		if (!current.matches) throw new ScheduledEventError("verification");
		if (current.status === "published") return { url, status: "published" };
		const publish = this.page
			.getByTestId("event-publish-btn")
			.filter({ visible: true });
		await publish.waitFor().catch(() => {
			throw new ScheduledEventError("editor");
		});
		// Recheck the issue and the exact trusted approval immediately before the irreversible action.
		await beforePublish();
		try {
			await publish.click();
			await this.page.waitForURL(
				(value) =>
					`${value.origin}${value.pathname}`.replace(/\/$/, "") ===
					url.replace(/\/$/, ""),
				{ waitUntil: "domcontentloaded" },
			);
		} catch {
			throw new ScheduledEventError("uncertain");
		}
		const saved = await verification.verify(event, url).catch(() => undefined);
		if (!saved?.matches || saved.status !== "published")
			throw new ScheduledEventError("verification");
		return { url, status: "published" };
	}
}
