import { ScheduledEventError } from "@meetup-automation/publication";
import type { Page } from "playwright-core";

export class OcgroupsLogin {
	constructor(
		private readonly page: Page,
		private readonly origin: string,
	) {}

	async login(username: string, password: string): Promise<void> {
		try {
			if (!username.trim() || !password) throw new Error();
			await this.page.goto(`${this.origin}/log-in`, {
				waitUntil: "domcontentloaded",
			});
			const form = this.page.locator('form:has(input[name="username"])');
			const action = new URL(
				(await form.getAttribute("action")) ?? "",
				this.page.url(),
			);
			if (
				this.page.url() !== `${this.origin}/log-in` ||
				action.href !== `${this.origin}/log-in` ||
				(await this.page
					.locator(
						'iframe[src*="captcha"], input[autocomplete="one-time-code"]',
					)
					.count())
			)
				throw new Error();
			await form.locator("#username").fill(username);
			await form.locator("#password").fill(password);
			await form.getByRole("button", { name: "Sign In", exact: true }).click();
			await this.page
				.locator('#user-dropdown-button[data-logged-in="true"]')
				.waitFor();
			if (
				new URL(this.page.url()).origin !== this.origin ||
				(
					await this.page
						.locator("#user-dropdown > ul > li:first-child .font-medium")
						.textContent()
				)?.trim() !== username
			)
				throw new Error();
		} catch {
			throw new ScheduledEventError("authentication");
		}
	}
}
