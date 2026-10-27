import type { CaptchaResolver } from "@meetup-automation/browser-authentication";
import {
	type EventPublicationGateway,
	type EventPublicationIdentity,
	MeetupEventUrl,
	MeetupGroupUrl,
	type SavedEventPublication,
	type ScheduledEvent,
	ScheduledEventError,
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
import type { SavedMeetupEvent } from "./saved-meetup-event.js";
import type { MeetupAttendeeMessage } from "./meetup-attendee-message.js";

export interface MeetupEventGatewayCollaborators {
	readonly createAttendeeMessage: (
		page: Page,
		group: MeetupGroupUrl,
	) => Pick<MeetupAttendeeMessage, "send">;
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

export class MeetupEventGateway implements EventPublicationGateway {
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

	async inspect(reference: string): Promise<SavedEventPublication> {
		return this.withPublication("UTC", (page) =>
			this.collaborators
				.createMeetupEventEditor(page, this.group.value)
				.inspect(reference),
		);
	}
	async sendSlides(
		eventUrl: string,
		pdfUrl: string,
		beforeSend: () => Promise<void>,
	): Promise<void> {
		await this.withSession("UTC", (page) =>
			this.collaborators
				.createAttendeeMessage(page, this.group)
				.send(eventUrl, pdfUrl, beforeSend),
		);
	}

	async save(
		event: ScheduledEvent,
		identity: EventPublicationIdentity | undefined,
		beforeSubmit: () => Promise<void>,
		onSaved: (identity: EventPublicationIdentity) => Promise<void>,
	): Promise<SavedEventPublication> {
		if (identity) this.verifyIdentity(identity);
		return this.withPublication(event.timeZone, (page) =>
			this.collaborators
				.createMeetupEventEditor(page, this.group.value)
				.save(event, identity?.reviewUrl, beforeSubmit, (url) =>
					onSaved(this.identity(url)),
				),
		);
	}

	async publish(
		event: ScheduledEvent,
		identity: EventPublicationIdentity,
		beforePublish: () => Promise<void>,
	): Promise<SavedEventPublication> {
		this.verifyIdentity(identity);
		return this.withPublication(event.timeZone, (page) =>
			this.collaborators
				.createMeetupEventPublisher(page, this.group.value)
				.publish(event, identity.reviewUrl, beforePublish),
		);
	}

	private identity(value: string): EventPublicationIdentity {
		const url = MeetupEventUrl.parse(value, this.group);
		if (!url) throw new ScheduledEventError("verification");
		return { id: url.id, reviewUrl: url.value, publicUrl: url.value };
	}

	private verifyIdentity(value: EventPublicationIdentity): void {
		const expected = this.identity(value.reviewUrl);
		if (
			value.id !== expected.id ||
			value.reviewUrl !== expected.reviewUrl ||
			value.publicUrl !== expected.publicUrl
		)
			throw new ScheduledEventError("verification");
	}

	private async withPublication(
		timezoneId: string,
		operation: (page: Page) => Promise<SavedMeetupEvent>,
	): Promise<SavedEventPublication> {
		const saved = await this.withSession(timezoneId, operation);
		return { identity: this.identity(saved.url), status: saved.status };
	}

	private async withSession<Result>(
		timezoneId: string,
		operation: (page: Page) => Promise<Result>,
	): Promise<Result> {
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
				timezoneId,
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
