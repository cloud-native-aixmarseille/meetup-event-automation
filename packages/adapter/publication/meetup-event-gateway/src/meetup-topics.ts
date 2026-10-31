import type {
	MeetupTopicSelection,
	ScheduledEvent,
} from "@meetup-automation/publication";
import type { Page } from "playwright-core";

/** Selects relevant provider topics only when an event has no selected topics. */
export class MeetupTopics {
	constructor(
		private readonly page: Page,
		private readonly selection: MeetupTopicSelection,
	) {}
	async select(
		event: Pick<ScheduledEvent, "title" | "description">,
	): Promise<readonly string[]> {
		const current = await this.selected();
		if (current.length > 5)
			throw new Error("Invalid existing Meetup topic selection");
		if (current.length) return current;
		const panel = this.panel();
		const candidates = (
			await panel.getByRole("button", { pressed: false }).allTextContents()
		).map((name) => name.trim());
		const topics = await this.selection.select(event, candidates);
		if (
			!topics.length ||
			topics.length > 5 ||
			new Set(topics).size !== topics.length ||
			topics.some((topic) => !candidates.includes(topic))
		)
			throw new Error("Invalid Meetup topic selection");
		for (const topic of topics) {
			await panel
				.getByRole("button", { name: topic, exact: true, pressed: false })
				.click();
			await panel
				.getByRole("button", { name: topic, exact: true, pressed: true })
				.waitFor();
		}
		return topics;
	}
	async matches(expected: readonly string[] | undefined): Promise<boolean> {
		const selected = await this.selected();
		return (
			selected.length > 0 &&
			selected.length <= 5 &&
			(!expected ||
				(selected.length === expected.length &&
					expected.every((topic) => selected.includes(topic))))
		);
	}
	private panel() {
		return this.page
			.getByPlaceholder("Search topics (max 5)...", { exact: true })
			.locator("../../../..");
	}
	private async selected(): Promise<readonly string[]> {
		const panel = this.panel();
		await panel.waitFor();
		return (
			await panel.getByRole("button", { pressed: true }).allTextContents()
		).map((name) => name.trim());
	}
}
