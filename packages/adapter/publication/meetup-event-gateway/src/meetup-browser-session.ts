import type { Browser, BrowserType, Page } from "playwright-core";
import type { MeetupChromeProcess } from "./meetup-chrome-process.js";

/** Binds a fresh browser page to the event timezone and always disposes it. */
export class MeetupBrowserSession {
	private browser?: Browser;

	constructor(
		private readonly browserType: Pick<BrowserType, "connectOverCDP">,
		private readonly process: Pick<MeetupChromeProcess, "start" | "close">,
	) {}

	async open(timezoneId: string): Promise<{ page: Page; endpoint: string }> {
		try {
			const endpoint = await this.process.start(timezoneId);
			this.browser = await this.browserType.connectOverCDP(endpoint, {
				noDefaults: true,
				timeout: 15_000,
			});
			const pages = this.browser
				.contexts()
				.flatMap((context) => context.pages());
			if (pages.length !== 1) throw new Error("Unexpected browser pages.");
			const page = pages[0];
			await page.setViewportSize({ width: 1440, height: 1000 });
			return { page, endpoint };
		} catch {
			await this.close();
			throw new Error("Browser session unavailable.");
		}
	}

	async close(): Promise<void> {
		try {
			await this.browser?.close();
		} finally {
			await this.process.close();
		}
	}
}
