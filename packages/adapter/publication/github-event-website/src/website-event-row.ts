import {
	EventWebsiteError,
	type WebsiteEvent,
} from "@meetup-automation/publication";
import type { WebsiteMessages } from "./i18n/website-messages.js";

/** The public calendar's table representation; no contact or agenda data is accepted. */
export class WebsiteEventRow {
	constructor(private readonly messages: WebsiteMessages) {}
	render(event: WebsiteEvent): string {
		this.validate(event);
		return `| ${this.month(event.date)} | [${event.date}](${event.url}) | ${this.escape(event.venue.name)} (${this.escape(event.venue.city)}) |`;
	}
	month(date: string): string {
		const month = new Intl.DateTimeFormat(this.messages.locale, {
			month: "long",
			timeZone: "UTC",
		}).format(new Date(`${date}T12:00:00Z`));
		return month[0].toLocaleUpperCase(this.messages.locale) + month.slice(1);
	}
	header(): string[] {
		return [this.messages.t("website.header", {}), "| --- | --- | --- |"];
	}
	cells(line: string): readonly string[] | undefined {
		if (!line.trim().startsWith("|") || !line.trim().endsWith("|"))
			return undefined;
		return line
			.trim()
			.split("|")
			.slice(1, -1)
			.map((cell) => cell.trim());
	}
	date(cell: string): string | undefined {
		return /^(?:\[)?(\d{4}-\d{2}-\d{2})(?:\]|$)/.exec(cell)?.[1];
	}
	url(cell: string): string | undefined {
		return /^\[\d{4}-\d{2}-\d{2}\]\((https:\/\/[^\s)]+)\)$/
			.exec(cell)?.[1]
			?.replace(/\/$/, "");
	}
	private validate(event: WebsiteEvent): void {
		const date = new Date(`${event.date}T12:00:00Z`);
		if (
			!/^\d{4}-\d{2}-\d{2}$/.test(event.date) ||
			!Number.isFinite(date.getTime()) ||
			date.toISOString().slice(0, 10) !== event.date ||
			!/^https:\/\/[^\s()<>[\]{}|`\\]+$/.test(event.url) ||
			[event.venue.name, event.venue.city].some(
				(value) => !value.trim() || /[\r\n]/.test(value),
			)
		)
			throw new EventWebsiteError("format");
	}
	private escape(value: string): string {
		return value
			.replaceAll("&", "&amp;")
			.replaceAll("|", "&#124;")
			.replaceAll("<", "&lt;")
			.replaceAll(">", "&gt;")
			.replace(/[\\`*_[\]]/g, "\\$&");
	}
}
