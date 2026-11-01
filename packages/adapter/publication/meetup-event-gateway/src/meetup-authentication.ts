import {
	ScheduledEventError,
	type ScheduledEventFailure,
} from "@meetup-automation/publication";
import type { Page } from "playwright-core";
import type { MeetupBrowserSession } from "./meetup-browser-session.js";
import type { MeetupLoginPage } from "./meetup-login-page.js";
import type { PublicationAuthenticationStatus } from "./meetup-session-status.js";
import type { MeetupSessionStore } from "./meetup-session-store.js";

type Session = Pick<MeetupBrowserSession, "open" | "close">;
export interface MeetupAuthenticationCollaborators {
	createSession(): Session;
	createLogin(
		page: Page,
		endpoint: string,
	): Pick<MeetupLoginPage, "login" | "verifyAccount">;
	store: MeetupSessionStore;
	delay(milliseconds: number): Promise<void>;
}

/** Retries authentication only; callers execute event writes exactly once. */
export class MeetupAuthentication {
	constructor(
		private readonly collaborators: MeetupAuthenticationCollaborators,
		private readonly credentials: { email: string; password: string },
	) {
		if (!credentials.email.trim() || !credentials.password)
			throw new ScheduledEventError("authentication-configuration");
	}

	async open(timezoneId: string): Promise<{ page: Page; session: Session }> {
		let failure: ScheduledEventFailure = "authentication-browser";
		for (let attempt = 0; attempt < 3; attempt++) {
			if (attempt > 0)
				await this.collaborators.delay(attempt === 1 ? 2_000 : 5_000);
			const session = this.collaborators.createSession();
			try {
				const { page, endpoint } = await session.open(timezoneId);
				const status = await this.authenticate(page, endpoint);
				if (status === "verified") {
					await page
						.context()
						.storageState()
						.then((state) => this.collaborators.store.save(state))
						.catch(() => undefined);
					return { page, session };
				}
				failure = `authentication-${status}`;
				if (
					[
						"credentials-rejected",
						"one-time-code",
						"account-mismatch",
						"unexpected-page",
						"rate-limited",
					].includes(status)
				)
					throw new ScheduledEventError(failure);
			} catch (error) {
				await session.close().catch(() => undefined);
				if (error instanceof ScheduledEventError) throw error;
				failure = "authentication-browser";
				continue;
			}
			await session.close().catch(() => undefined);
		}
		throw new ScheduledEventError(failure);
	}

	private async authenticate(
		page: Page,
		endpoint: string,
	): Promise<PublicationAuthenticationStatus> {
		const login = this.collaborators.createLogin(page, endpoint);
		const stored = await this.collaborators.store.load().catch(() => undefined);
		if (stored) {
			try {
				await page.context().setStorageState(stored);
				const status = await login.verifyAccount(this.credentials.email);
				if (status === "verified") return status;
				if (
					[
						"one-time-code",
						"account-mismatch",
						"unexpected-page",
						"rate-limited",
					].includes(status)
				)
					return status;
			} catch {
				/* An unusable snapshot cannot authorize an operation. */
			}
			await page.context().setStorageState({ cookies: [], origins: [] });
			await this.collaborators.store.clear();
		}
		return login.login(this.credentials.email, this.credentials.password);
	}
}
