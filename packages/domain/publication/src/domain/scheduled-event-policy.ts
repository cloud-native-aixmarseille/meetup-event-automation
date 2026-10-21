import type { ScheduledEvent } from "../application/scheduled-event-ports.js";

export class ScheduledEventPolicy {
	valid(event: ScheduledEvent, now: string): boolean {
		if (
			!event.title.trim() ||
			event.title.length > 80 ||
			!event.description.trim() ||
			event.description.length > 49_000 ||
			!event.venue.name.trim() ||
			!event.venue.city.trim() ||
			!this.validTime(event.startTime) ||
			!this.validTime(event.endTime) ||
			event.endTime <= event.startTime ||
			!/^\d{4}-\d{2}-\d{2}$/.test(event.date)
		)
			return false;
		const date = new Date(`${event.date}T12:00:00Z`);
		if (
			!Number.isFinite(date.getTime()) ||
			date.toISOString().slice(0, 10) !== event.date
		)
			return false;
		try {
			const format = new Intl.DateTimeFormat("sv-SE", {
				timeZone: event.timeZone,
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
				hour: "2-digit",
				minute: "2-digit",
				hourCycle: "h23",
			});
			const start = this.instant(event.date, event.startTime, format);
			const end = this.instant(event.date, event.endTime, format);
			return (
				start !== undefined &&
				end !== undefined &&
				start > Date.parse(now) &&
				end > start
			);
		} catch {
			return false;
		}
	}

	validTime(value: string): boolean {
		return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
	}

	private instant(
		date: string,
		time: string,
		format: Intl.DateTimeFormat,
	): number | undefined {
		const reference = Date.parse(`${date}T${time}:00Z`);
		let match: number | undefined;
		// Resolve wall-clock input without silently shifting nonexistent times
		// or choosing one occurrence of a repeated daylight-saving time.
		for (let offset = -840; offset <= 840; offset += 15) {
			const candidate = reference + offset * 60_000;
			if (format.format(candidate) !== `${date} ${time}`) continue;
			if (match !== undefined) return undefined;
			match = candidate;
		}
		return match;
	}
}
