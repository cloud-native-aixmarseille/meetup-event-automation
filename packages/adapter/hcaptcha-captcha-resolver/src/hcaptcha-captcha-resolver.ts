import type {
	CaptchaResolver,
	CaptchaStatus,
} from "@meetup-automation/browser-authentication";
import type { Page } from "playwright-core";
import type { HcaptchaChallenge } from "./hcaptcha-challenge.js";

/** Owns hCaptcha detection and response verification for one browser page. */
export class HcaptchaCaptchaResolver implements CaptchaResolver {
	constructor(
		private readonly challenge: Pick<HcaptchaChallenge, "solve">,
		private readonly page: Page,
	) {}

	async inspect(): Promise<CaptchaStatus> {
		return (await this.state()) === "clear" ? "clear" : "required";
	}

	async resolve(): Promise<CaptchaStatus> {
		const state = await this.state();
		if (state === "clear") return "clear";
		if (state === "unsupported" || !(await this.challenge.solve(this.page)))
			return "required";
		if (!(await this.hasResponse())) return "required";
		return this.inspect();
	}

	private async state(): Promise<"clear" | "supported" | "unsupported"> {
		if (await this.visible('iframe[src*="/recaptcha/"]')) return "unsupported";
		if (await this.hasResponse()) return "clear";
		return (await this.visible('iframe[src*="hcaptcha.com"]'))
			? "supported"
			: "clear";
	}

	private async hasResponse(): Promise<boolean> {
		const response = this.page.locator('[name="h-captcha-response"]').first();
		return (
			(await response.count()) > 0 && (await response.inputValue()).length > 0
		);
	}

	private async visible(selector: string): Promise<boolean> {
		for (const element of await this.page.locator(selector).all())
			if (await element.isVisible()) return true;
		return false;
	}
}
