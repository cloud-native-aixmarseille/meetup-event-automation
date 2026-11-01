import type { CaptchaResolver } from "@meetup-automation/browser-authentication";
import type { Page } from "playwright-core";
import type { MeetupBrowserRoutes } from "./meetup-browser-routes.js";
import type { PublicationAuthenticationStatus } from "./meetup-session-status.js";

export interface MeetupLoginPageCollaborators {
	readonly meetupBrowserRoutes: Pick<
		MeetupBrowserRoutes,
		"login" | "account" | "isMeetupLocation" | "isPath"
	>;
}

/** Only bounded, allowlisted failure categories leave the browser boundary. */
export class MeetupLoginPage {
	constructor(
		private readonly collaborators: MeetupLoginPageCollaborators,
		private readonly page: Page,
		private readonly captcha: CaptchaResolver,
		private readonly origin: string,
	) {
		page.setDefaultTimeout(15_000);
		page.setDefaultNavigationTimeout(30_000);
	}

	async login(
		email: string,
		password: string,
	): Promise<PublicationAuthenticationStatus> {
		try {
			const response = await this.page.goto(
				this.collaborators.meetupBrowserRoutes.login(this.origin),
				{ waitUntil: "domcontentloaded" },
			);
			if (response?.status() === 429) return "rate-limited";
			await this.dismissCookieNotice();
		} catch {
			return "login-page-unavailable";
		}
		if (!this.isMeetupPath("/login")) {
			if (!this.isMeetupLocation()) return "unexpected-page";
			return this.verifyAccount(email);
		}
		const challenge = await this.prepareChallenge();
		if (challenge) return challenge;
		try {
			await this.page.locator('input[name="email"]').fill(email);
			await this.page.locator('input[name="current-password"]').fill(password);
		} catch {
			return "login-form-unavailable";
		}
		try {
			await this.page
				.getByRole("button", { name: "Log in", exact: true })
				.click();
		} catch {
			return (await this.challengeStatus()) ?? "submit-unavailable";
		}
		try {
			await this.page.waitForURL(
				(url) =>
					this.collaborators.meetupBrowserRoutes.isMeetupLocation(
						url,
						this.origin,
					) && !url.pathname.startsWith("/login"),
				{ timeout: 30_000, waitUntil: "domcontentloaded" },
			);
		} catch {
			return this.submissionFailure();
		}
		return this.verifyAccount(email);
	}

	async verifyAccount(email: string): Promise<PublicationAuthenticationStatus> {
		try {
			const response = await this.page.goto(
				this.collaborators.meetupBrowserRoutes.account(this.origin),
				{ waitUntil: "domcontentloaded" },
			);
			if (response?.status() === 429) return "rate-limited";
			const challenge = await this.challengeStatus();
			if (challenge) return challenge;
			if (this.isMeetupPath("/login")) return "session-not-reusable";
			if (!this.isMeetupPath("/account/management")) return "unexpected-page";
			const accountEmail = this.page.locator('input[name="email"]');
			await accountEmail.waitFor();
			return (await accountEmail.inputValue()).toLowerCase() ===
				email.toLowerCase()
				? "verified"
				: "account-mismatch";
		} catch {
			return "account-unavailable";
		}
	}

	private async submissionFailure(): Promise<PublicationAuthenticationStatus> {
		if (!this.isMeetupLocation()) return "unexpected-page";
		if (
			await this.page
				.getByText(
					/invalid_captcha_error|invalid captcha|captcha.*(invalid|expired)/i,
				)
				.first()
				.isVisible()
		)
			return "captcha-rejected";
		if (
			await this.page
				.getByText(/incorrect (email|password)|invalid (email|password)/i)
				.first()
				.isVisible()
		)
			return "credentials-rejected";
		return (await this.challengeStatus()) ?? "redirect-timeout";
	}

	private isMeetupLocation(): boolean {
		return this.collaborators.meetupBrowserRoutes.isMeetupLocation(
			new URL(this.page.url()),
			this.origin,
		);
	}
	private isMeetupPath(path: string): boolean {
		return this.collaborators.meetupBrowserRoutes.isPath(
			new URL(this.page.url()),
			path,
			this.origin,
		);
	}

	private async challengeStatus(): Promise<PublicationAuthenticationStatus | null> {
		for (const input of await this.page
			.locator('input[autocomplete="one-time-code"]')
			.all())
			if (await input.isVisible()) return "one-time-code";
		return (await this.captcha.inspect()) === "required"
			? "captcha-required"
			: null;
	}

	private async prepareChallenge(): Promise<PublicationAuthenticationStatus | null> {
		try {
			const status = await this.challengeStatus();
			if (status !== "captcha-required") return status;
			if ((await this.captcha.resolve()) !== "clear") return "captcha-required";
			if (!this.isMeetupPath("/login")) return "unexpected-page";
			return this.challengeStatus();
		} catch {
			return "captcha-unavailable";
		}
	}

	private async dismissCookieNotice(): Promise<void> {
		const decline = this.page.getByRole("button", {
			name: "Continue without accepting",
			exact: true,
		});
		try {
			await decline.waitFor({ timeout: 5_000 });
		} catch {
			return;
		}
		await decline.click();
	}
}
export type MeetupLoginPageArguments =
	ConstructorParameters<typeof MeetupLoginPage> extends [unknown, ...infer Args]
		? Args
		: never;
