import type { CaptchaResolver } from "@meetup-automation/browser-authentication";
import type { Page } from "playwright-core";
import type { MeetupBrowserRoutes } from "./meetup-browser-routes.js";
import type { PublicationAuthenticationStatus } from "./meetup-session-status.js";

/** All reads are bounded; provider text and account details never leave this class. */
export interface MeetupLoginPageCollaborators {
	readonly meetupBrowserRoutes: Pick<
		MeetupBrowserRoutes,
		"login" | "account" | "isMeetupLocation" | "isPath"
	>;
}

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
		await this.page.goto(
			this.collaborators.meetupBrowserRoutes.login(this.origin),
			{
				waitUntil: "domcontentloaded",
			},
		);
		await this.dismissCookieNotice();
		if (!this.isMeetupPath("/login")) return "unexpected-page";
		await this.page.locator('input[name="email"]').waitFor();
		const challengeStatus = await this.prepareChallenge();
		if (challengeStatus) return challengeStatus;
		await this.page.locator('input[name="email"]').fill(email);
		await this.page.locator('input[name="current-password"]').fill(password);
		const submit = this.page.getByRole("button", {
			name: "Log in",
			exact: true,
		});
		if (!(await submit.isEnabled()))
			return (await this.hasChallenge())
				? "challenge-required"
				: "unexpected-page";
		await submit.click();
		try {
			await this.page.waitForURL(
				(url) =>
					this.collaborators.meetupBrowserRoutes.isMeetupLocation(
						url,
						this.origin,
					) && !url.pathname.startsWith("/login"),
				{ timeout: 15_000, waitUntil: "domcontentloaded" },
			);
		} catch {
			if (await this.hasChallenge()) return "challenge-required";
			if (await this.hasRejectedCredentials()) return "credentials-rejected";
			return "unexpected-page";
		}
		return this.verifyAccount(email);
	}

	async verifyAccount(email: string): Promise<PublicationAuthenticationStatus> {
		await this.page.goto(
			this.collaborators.meetupBrowserRoutes.account(this.origin),
			{
				waitUntil: "domcontentloaded",
			},
		);
		if (await this.hasChallenge()) return "challenge-required";
		if (this.isMeetupPath("/login")) return "session-not-reusable";
		if (!this.isMeetupPath("/account/management")) return "unexpected-page";
		// A URL change alone is not authentication evidence. Confirm the account
		// email in the settings form; a changed UI fails closed.
		const accountEmail = this.page.locator('input[name="email"]');
		await accountEmail.waitFor();
		return (await accountEmail.inputValue()).toLowerCase() ===
			email.toLowerCase()
			? "verified"
			: "unexpected-page";
	}

	private isMeetupPath(path: string): boolean {
		const url = new URL(this.page.url());
		return this.collaborators.meetupBrowserRoutes.isPath(
			url,
			path,
			this.origin,
		);
	}

	private async hasChallenge(): Promise<boolean> {
		return (
			(await this.hasOneTimeCode()) ||
			(await this.captcha.inspect()) === "required"
		);
	}

	private async prepareChallenge(): Promise<PublicationAuthenticationStatus | null> {
		if (!(await this.hasChallenge())) return null;
		if (
			(await this.hasOneTimeCode()) ||
			(await this.captcha.resolve()) !== "clear"
		)
			return "challenge-required";
		if (!this.isMeetupPath("/login")) return "unexpected-page";
		if (await this.hasChallenge()) return "challenge-required";
		return null;
	}

	private async hasOneTimeCode(): Promise<boolean> {
		for (const input of await this.page
			.locator('input[autocomplete="one-time-code"]')
			.all())
			if (await input.isVisible()) return true;
		return false;
	}

	private async hasRejectedCredentials(): Promise<boolean> {
		return this.page
			.getByText(/incorrect (email|password)|invalid (email|password)/i)
			.first()
			.isVisible();
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
