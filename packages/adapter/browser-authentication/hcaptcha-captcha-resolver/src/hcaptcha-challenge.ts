import type { Page } from "playwright-core";
import type { HcaptchaProcess } from "./hcaptcha-process.js";

export class HcaptchaChallenge {
	private attempts = 0;

	constructor(
		private readonly process: Pick<HcaptchaProcess, "run">,
		private readonly apiKey: string,
		private readonly model: string,
	) {
		if (!apiKey.trim() || !model.trim())
			throw new Error("Gemini credentials and model are required.");
	}

	async solve(page: Page, endpoint: string): Promise<boolean> {
		if (this.attempts >= 2) return false;
		this.attempts++;
		const targetUrl = page.url();
		const result = await this.process.run({
			endpoint,
			targetUrl,
			apiKey: this.apiKey,
			model: this.model,
		});
		if (result === "unavailable")
			throw new Error("Challenge solver unavailable.");
		return result === "solved";
	}
}
export type HcaptchaChallengeArguments = ConstructorParameters<
	typeof HcaptchaChallenge
>;
