import {
	type SavedScheduledEvent,
	type ScheduledEvent,
	ScheduledEventError,
	type ScheduledEventGateway,
} from "@meetup-automation/publication";
import { type BrowserType, type Page, chromium } from "playwright-core";
import {
	HcaptchaChallenge,
	type LoginChallenge,
} from "./hcaptcha-challenge.js";
import { MeetupEventPublisher } from "./meetup-event-publisher.js";
import { MeetupEventEditor } from "./meetup-event-editor.js";
import { MeetupLoginPage } from "./meetup-login-page.js";

export class MeetupEventGateway implements ScheduledEventGateway {
	constructor(
		private readonly browserType: Pick<BrowserType, "launch">,
		private readonly credentials: { email: string; password: string },
		private readonly challenge: LoginChallenge,
		private readonly groupUrl: string,
	) {}

	static create(
		credentials: { email: string; password: string },
		solverDirectory: string,
		geminiApiKey: string,
		geminiModel: string,
		groupUrl: string,
	): ScheduledEventGateway {
		return new MeetupEventGateway(
			chromium,
			credentials,
			HcaptchaChallenge.create(solverDirectory, geminiApiKey, geminiModel),
			groupUrl,
		);
	}

	async save(
		event: ScheduledEvent,
		url: string | undefined,
		beforeSubmit: () => Promise<void>,
		onSaved: (url: string) => Promise<void>,
	): Promise<SavedScheduledEvent> {
		return this.withSession(event, (page) =>
			new MeetupEventEditor(page, this.groupUrl).save(
				event,
				url,
				beforeSubmit,
				onSaved,
			),
		);
	}

	async publish(
		event: ScheduledEvent,
		url: string,
		beforePublish: () => Promise<void>,
	): Promise<SavedScheduledEvent> {
		return this.withSession(event, (page) =>
			new MeetupEventPublisher(page, this.groupUrl).publish(
				event,
				url,
				beforePublish,
			),
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
			const status = await new MeetupLoginPage(page, this.challenge)
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
