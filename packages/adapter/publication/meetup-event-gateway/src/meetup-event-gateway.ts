import type { CaptchaResolver } from "@meetup-automation/browser-authentication";
import {
	type EventPublicationGateway,
	type PublicationWriteGuard,
	type EventPublicationIdentity,
	MeetupEventUrl,
	MeetupGroupUrl,
	type MeetupPublicationEvent,
	type SavedEventPublication,
	ScheduledEventError,
} from "@meetup-automation/publication";
import type { Page } from "playwright-core";
import type { MeetupAttendeeMessage } from "./meetup-attendee-message.js";
import type { MeetupBrowserSession } from "./meetup-browser-session.js";
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

export interface MeetupEventGatewayCollaborators {
	readonly createBrowserSession: () => Pick<
		MeetupBrowserSession,
		"open" | "close"
	>;
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

export class MeetupEventGateway
	implements EventPublicationGateway<MeetupPublicationEvent>
{
	private readonly group: MeetupGroupUrl;

	constructor(
		private readonly collaborators: MeetupEventGatewayCollaborators,
		private readonly credentials: { email: string; password: string },
		private readonly createCaptchaResolver: (
			page: Page,
			endpoint: string,
		) => CaptchaResolver,
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
		event: MeetupPublicationEvent,
		identity: EventPublicationIdentity | undefined,
		beforeSubmit: PublicationWriteGuard,
		onSaved: (identity: EventPublicationIdentity) => Promise<void>,
	): Promise<SavedEventPublication> {
		if (identity) this.verifyIdentity(identity);
		return this.withPublication(event.timeZone, (page) =>
			this.collaborators.createMeetupEventEditor(page, this.group.value).save(
				event,
				identity?.reviewUrl,
				() => beforeSubmit("event"),
				(url) => onSaved(this.identity(url)),
			),
		);
	}

	async publish(
		event: MeetupPublicationEvent,
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
		const session = this.collaborators.createBrowserSession();
		try {
			const { page, endpoint } = await session.open(timezoneId).catch(() => {
				throw new ScheduledEventError("unavailable");
			});
			const status = await this.collaborators
				.createMeetupLoginPage(
					page,
					this.createCaptchaResolver(page, endpoint),
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
			await session.close().catch(() => undefined);
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
