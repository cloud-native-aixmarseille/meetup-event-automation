import {
	EventWebsiteError,
	type WebsiteEvent,
} from "@meetup-automation/publication";
import type { WebsiteEventRow } from "./website-event-row.js";

/** Edit only the matching calendar row; preserve all unrelated Markdown. */
export class WebsiteCalendarCodec {
	constructor(private readonly row: WebsiteEventRow) {}
	upsert(content: string, event: WebsiteEvent): string {
		const rendered = this.row.render(event);
		const newline = content.includes("\r\n") ? "\r\n" : "\n";
		const lines = content.split(/\r?\n/);
		const matches = lines.flatMap((line, index) =>
			this.row.url(this.row.cells(line)?.[1] ?? "") ===
			event.url.replace(/\/$/, "")
				? [index]
				: [],
		);
		if (matches.length > 1) throw new EventWebsiteError("conflict");
		const existing = matches[0];
		const year = event.date.slice(0, 4);
		if (existing !== undefined) {
			const heading = lines
				.slice(0, existing)
				.reverse()
				.find((line) => /^## \d{4}\s*$/.test(line));
			const cells = this.row.cells(lines[existing]);
			if (heading) this.table(lines, heading.trim().slice(3));
			if (!heading || cells?.length !== 3)
				throw new EventWebsiteError("format");
			if (
				heading.trim() === `## ${year}` &&
				this.row.date(cells[1])?.slice(0, 7) === event.date.slice(0, 7)
			) {
				lines[existing] = rendered;
				return lines.join(newline);
			}
			lines.splice(existing, 1);
		}
		this.insert(lines, event, rendered);
		return lines.join(newline);
	}
	private insert(lines: string[], event: WebsiteEvent, rendered: string): void {
		const rows = this.table(lines, event.date.slice(0, 4));
		if (!rows) {
			this.addYear(lines, event.date.slice(0, 4), rendered);
			return;
		}
		const data = rows.slice(2);
		const candidates = data.filter(
			({ cells }) =>
				/^(?:\d{4}-\d{2}-\d{2}|-)$/.test(cells[1]) &&
				(this.row.date(cells[1])?.slice(0, 7) === event.date.slice(0, 7) ||
					cells[0].toLocaleLowerCase() ===
						this.row.month(event.date).toLocaleLowerCase()),
		);
		const exact = candidates.filter(
			({ cells }) => this.row.date(cells[1]) === event.date,
		);
		const selected = exact.length ? exact : candidates;
		if (selected.length > 1) throw new EventWebsiteError("conflict");
		if (selected[0]) {
			lines[selected[0].index] = rendered;
			return;
		}
		const next = data.find(
			({ cells }) => (this.row.date(cells[1]) ?? "") > event.date,
		);
		lines.splice(next?.index ?? rows[rows.length - 1].index + 1, 0, rendered);
	}

	private table(lines: readonly string[], year: string) {
		const headings = lines.flatMap((line, index) =>
			line.trim() === `## ${year}` ? [index] : [],
		);
		if (headings.length > 1) throw new EventWebsiteError("conflict");
		const start = headings[0];
		if (start === undefined) return undefined;
		let end = lines.findIndex(
			(line, index) => index > start && /^## /.test(line),
		);
		if (end < 0) end = lines.length;
		const rows = lines.slice(start + 1, end).flatMap((line, offset) => {
			const cells = this.row.cells(line);
			return cells ? [{ index: start + 1 + offset, cells }] : [];
		});
		if (
			rows.length < 2 ||
			rows.some(({ cells }) => cells.length !== 3) ||
			!rows[1].cells.every((cell) => /^:?-+:?$/.test(cell))
		)
			throw new EventWebsiteError("format");
		return rows;
	}
	private addYear(lines: string[], year: string, rendered: string): void {
		if (!lines.some((line) => /^## \d{4}\s*$/.test(line)))
			throw new EventWebsiteError("format");
		const next = lines.findIndex(
			(line) => /^## \d{4}\s*$/.test(line) && line.trim().slice(3) < year,
		);
		lines.splice(
			next < 0 ? lines.length : next,
			0,
			`## ${year}`,
			"",
			...this.row.header(),
			rendered,
			"",
		);
	}
}
