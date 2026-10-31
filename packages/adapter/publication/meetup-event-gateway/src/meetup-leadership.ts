import type { MeetupGroupUrl } from "@meetup-automation/publication";
import type { Page } from "playwright-core";

/** Reads the complete leadership list, independently of suggested active hosts. */
export class MeetupLeadership {
	constructor(private readonly page: Page) {}
	async members(group: MeetupGroupUrl): Promise<readonly string[]> {
		const roster = await this.page.context().newPage();
		roster.setDefaultTimeout(15_000);
		roster.setDefaultNavigationTimeout(30_000);
		try {
			await roster.goto(`${group.value}members/?op=leaders`, {
				waitUntil: "domcontentloaded",
			});
			const count = roster.getByText(/^\d+ leadership team$/).first();
			await count.waitFor();
			const expected = Number.parseInt(await count.innerText(), 10);
			if (!Number.isSafeInteger(expected) || expected < 1 || expected > 1000)
				throw new Error("Invalid Meetup leadership count");
			const selector = 'main [role="link"] a[href*="/members/"]';
			const members = roster.locator(selector);
			await members.first().waitFor();
			while ((await members.count()) < expected) {
				const previous = await members.count();
				await roster.evaluate(() =>
					window.scrollTo(0, document.body.scrollHeight),
				);
				await roster.waitForFunction(
					({ selector, previous }) =>
						document.querySelectorAll(selector).length > previous,
					{ selector, previous },
				);
			}
			const names = (await members.allTextContents()).map((name) =>
				name.trim(),
			);
			if (
				names.length !== expected ||
				names.some((name) => !name) ||
				new Set(names).size !== expected
			)
				throw new Error("Incomplete or ambiguous Meetup leadership list");
			return names;
		} finally {
			await roster.close();
		}
	}
}
