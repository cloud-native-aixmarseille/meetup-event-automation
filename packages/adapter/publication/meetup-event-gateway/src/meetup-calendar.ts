import type { Page } from "playwright-core";

export class MeetupCalendar {
	constructor(private readonly page: Page) {}

	async select(label: string, date: string): Promise<void> {
		await this.dateTrigger(label).click();
		// React DayPicker exposes date cells even though the date input is read-only.
		const target = this.page.locator(`[data-day="${date}"] button`);
		for (let month = 0; month < 25; month++) {
			if (await target.isVisible()) {
				await target.click();
				return;
			}
			const dates = await this.page.locator("[data-day]").evaluateAll((cells) =>
				cells
					.map((cell) => cell.getAttribute("data-day") ?? "")
					.filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
					.sort(),
			);
			if (!dates.length) throw new Error("Calendar date cells are unavailable");
			const direction = date < (dates[0] ?? "") ? "previous" : "next";
			await this.page
				.getByRole("button", {
					name: new RegExp(`^Go to the ${direction} month$`, "i"),
				})
				.click();
		}
		throw new Error("Calendar date is outside the supported range");
	}

	async fill(date: string, startTime: string, endTime: string): Promise<void> {
		await this.select("Open date picker", date);
		await this.page
			.getByLabel("Edit start time", { exact: true })
			.fill(startTime);
		await this.showEndTime();
		await this.select("Open end date picker", date);
		const end = this.page.getByLabel("Edit end time", { exact: true });
		await end.fill(endTime);
		await end.press("Tab");
	}

	async matches(
		date: string,
		startTime: string,
		endTime: string,
	): Promise<boolean> {
		if (!(await this.matchesDate("Open date picker", date))) return false;
		await this.showEndTime();
		return (
			(await this.matchesDate("Open end date picker", date)) &&
			(await this.page
				.getByLabel("Edit start time", { exact: true })
				.inputValue()) === startTime &&
			(await this.page
				.getByLabel("Edit end time", { exact: true })
				.inputValue()) === endTime
		);
	}

	private async matchesDate(label: string, date: string): Promise<boolean> {
		const trigger = this.dateTrigger(label);
		await trigger.click();
		await this.page.locator("[data-day]:visible").first().waitFor();
		const selected = this.page.locator(
			`[data-day="${date}"][data-selected="true"]`,
		);
		const matches = await selected.isVisible();
		await this.page.keyboard.press("Escape");
		return matches;
	}

	private dateTrigger(label: string) {
		return this.page
			.getByRole("button", { name: label, exact: true })
			.and(this.page.locator('[aria-haspopup="dialog"]'));
	}

	private async showEndTime(): Promise<void> {
		const end = this.page.getByLabel("Edit end time", { exact: true });
		if (!(await end.isVisible())) {
			await this.page.locator("#duration").getByRole("button").click();
			await this.page
				.getByRole("menuitem", { name: "Set an end time...", exact: true })
				.click();
		}
	}
}
export type MeetupCalendarArguments = ConstructorParameters<
	typeof MeetupCalendar
>;
