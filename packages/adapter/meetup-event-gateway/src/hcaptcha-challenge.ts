import type { Page } from "playwright-core";
import { ChromiumEndpoint } from "./chromium-endpoint.js";
import { HcaptchaProcess } from "./hcaptcha-process.js";

export interface LoginChallenge {
	solve(page: Page): Promise<boolean>;
}

export class HcaptchaChallenge implements LoginChallenge {
	private attempted = false;

	constructor(
		private readonly process: Pick<HcaptchaProcess, "run">,
		private readonly apiKey: string,
		private readonly model: string,
	) {
		if (!apiKey.trim() || !model.trim())
			throw new Error("Gemini credentials and model are required.");
	}

	static create(
		directory: string,
		apiKey: string,
		model: string,
	): HcaptchaChallenge {
		return new HcaptchaChallenge(
			HcaptchaProcess.create(directory),
			apiKey,
			model,
		);
	}

	async solve(page: Page): Promise<boolean> {
		if (this.attempted) return false;
		this.attempted = true;
		const browser = page.context().browser();
		if (!browser) throw new Error("Browser unavailable.");
		const endpoint = await ChromiumEndpoint.read(browser);
		const result = await this.process.run(endpoint, this.apiKey, this.model);
		if (result === "unavailable")
			throw new Error("Challenge solver unavailable.");
		return result === "solved";
	}
}
