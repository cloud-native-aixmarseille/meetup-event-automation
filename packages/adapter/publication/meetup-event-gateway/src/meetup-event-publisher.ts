import {
	MeetupEventUrl,
	MeetupGroupUrl,
	type MeetupPublicationEvent,
	ScheduledEventError,
} from "@meetup-automation/publication";
import type { Page } from "playwright-core";
import type { MeetupBrowserRoutes } from "./meetup-browser-routes.js";
import type {
	MeetupEventVerification,
	MeetupEventVerificationArguments,
} from "./meetup-event-verification.js";
import type { SavedMeetupEvent } from "./saved-meetup-event.js";

export interface MeetupEventPublisherCollaborators {
	readonly meetupBrowserRoutes: Pick<MeetupBrowserRoutes, "eventLocation">;
	readonly createMeetupEventVerification: (
		...args: MeetupEventVerificationArguments
	) => MeetupEventVerification;
}

export class MeetupEventPublisher {
	constructor(
		private readonly collaborators: MeetupEventPublisherCollaborators,
		private readonly page: Page,
		private readonly groupUrl: string,
	) {
		page.setDefaultTimeout(15_000);
		page.setDefaultNavigationTimeout(30_000);
	}
	async publish(
		event: MeetupPublicationEvent,
		url: string,
		beforePublish: () => Promise<void>,
	): Promise<SavedMeetupEvent> {
		const group = MeetupGroupUrl.parse(this.groupUrl);
		const identity = group && MeetupEventUrl.parse(url, group);
		if (!identity || identity.value !== url)
			throw new ScheduledEventError("editor");
		const verification = this.collaborators.createMeetupEventVerification(
			this.page,
		);
		const current = await verification.verify(event, identity).catch(() => {
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
					this.collaborators.meetupBrowserRoutes.eventLocation(
						value,
						identity.group,
					)?.value === url,
				{ waitUntil: "domcontentloaded" },
			);
		} catch {
			throw new ScheduledEventError("uncertain");
		}
		const saved = await verification
			.verify(event, identity)
			.catch(() => undefined);
		if (!saved?.matches || saved.status !== "published")
			throw new ScheduledEventError("verification");
		return { url, status: "published" };
	}
}
export type MeetupEventPublisherArguments =
	ConstructorParameters<typeof MeetupEventPublisher> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
