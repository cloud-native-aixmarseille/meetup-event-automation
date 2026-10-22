import type { CaptchaResolver } from "@meetup-automation/browser-authentication";
import {
	MeetupGroupUrl,
	type SavedScheduledEvent,
	type ScheduledEvent,
	ScheduledEventError,
	type ScheduledEventGateway,
} from "@meetup-automation/publication";
import type { BrowserType, Page } from "playwright-core";
import type {
	MeetupEventEditor,
	MeetupEventEditorArguments,
} from "./meetup-event-editor.js";
import type {
	MeetupEventPublisher,
	MeetupEventPublisherArguments,
} from "./meetup-event-publisher.js";
import type {
	MeetupLoginPage,
	MeetupLoginPageArguments,
} from "./meetup-login-page.js";

export interface MeetupEventGatewayCollaborators {
	readonly createMeetupEventEditor: (
		...args: MeetupEventEditorArguments
	) => MeetupEventEditor;
	readonly createMeetupEventPublisher: (
		...args: MeetupEventPublisherArguments
	) => MeetupEventPublisher;
	readonly createMeetupLoginPage: (
		...args: MeetupLoginPageArguments
	) => MeetupLoginPage;
}

export class MeetupEventGateway implements ScheduledEventGateway {
	private readonly group: MeetupGroupUrl;

	constructor(
		private readonly collaborators: MeetupEventGatewayCollaborators,
		private readonly browserType: Pick<BrowserType, "launch">,
		private readonly credentials: { email: string; password: string },
		private readonly createCaptchaResolver: (page: Page) => CaptchaResolver,
		groupUrl: string,
	) {
		const group = MeetupGroupUrl.parse(groupUrl);
		if (!group) throw new ScheduledEventError("editor");
		this.group = group;
	}

	async save(
		event: ScheduledEvent,
		url: string | undefined,
		beforeSubmit: () => Promise<void>,
		onSaved: (url: string) => Promise<void>,
	): Promise<SavedScheduledEvent> {
		return this.withSession(event, (page) =>
			this.collaborators
				.createMeetupEventEditor(page, this.group.value)
				.save(event, url, beforeSubmit, onSaved),
		);
	}

	async publish(
		event: ScheduledEvent,
		url: string,
		beforePublish: () => Promise<void>,
	): Promise<SavedScheduledEvent> {
		return this.withSession(event, (page) =>
			this.collaborators
				.createMeetupEventPublisher(page, this.group.value)
				.publish(event, url, beforePublish),
		);
	}

	private async withSession(
		event: ScheduledEvent,
		operation: (page: Page) => Promise<SavedScheduledEvent>,
	): Promise<SavedScheduledEvent> {
		if (!this.credentials.email.trim() || !this.credentials.password)
			throw new ScheduledEventError("authentication");
		const browser = await this.browserType
			.launch({
				headless: true,
				args: [
					"--enable-automation",
					"--remote-debugging-address=127.0.0.1",
					"--remote-debugging-port=0",
				],
			})
			.catch(() => {
				throw new ScheduledEventError("unavailable");
			});
		try {
			const context = await browser.newContext({
				locale: "en-US",
				timezoneId: event.timeZone,
				viewport: { width: 1440, height: 1000 },
			});
			const page = await context.newPage();
			const status = await this.collaborators
				.createMeetupLoginPage(
					page,
					this.createCaptchaResolver(page),
					this.group.origin,
				)
				.login(this.credentials.email, this.credentials.password)
				.catch(() => "unavailable");
			if (status !== "verified")
				throw new ScheduledEventError(
					["unavailable", "unexpected-page"].includes(status)
						? "unavailable"
						: "authentication",
				);
			return await operation(page);
		} finally {
			// Do not let cleanup replace a publication result or its recovery state.
			await browser.close().catch(() => undefined);
		}
	}
}
export type MeetupEventGatewayArguments =
	ConstructorParameters<typeof MeetupEventGateway> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
