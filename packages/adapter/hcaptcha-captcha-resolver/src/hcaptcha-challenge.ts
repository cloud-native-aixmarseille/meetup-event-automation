import type { Page } from "playwright-core";
import type { ChromiumEndpoint } from "./chromium-endpoint.js";
import type { HcaptchaProcess } from "./hcaptcha-process.js";

export interface HcaptchaChallengeCollaborators {
	readonly chromiumEndpoint: Pick<ChromiumEndpoint, "read">;
}

export class HcaptchaChallenge {
	private attempted = false;

	constructor(
		private readonly collaborators: HcaptchaChallengeCollaborators,
		private readonly process: Pick<HcaptchaProcess, "run">,
		private readonly apiKey: string,
		private readonly model: string,
	) {
		if (!apiKey.trim() || !model.trim())
			throw new Error("Gemini credentials and model are required.");
	}

	async solve(page: Page): Promise<boolean> {
		if (this.attempted) return false;
		this.attempted = true;
		const targetUrl = page.url();
		const browser = page.context().browser();
		if (!browser) throw new Error("Browser unavailable.");
		const endpoint = await this.collaborators.chromiumEndpoint.read(browser);
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
export type HcaptchaChallengeArguments =
	ConstructorParameters<typeof HcaptchaChallenge> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
