import type { SocialPostMilestone } from "./social-post-draft.js";
export interface SocialPostSchedule {
	readonly facts: Readonly<{
		date: string;
		startTime: string;
		timeZone: string;
	}>;
	readonly plannedAt: string | null;
}

export class SocialPostTiming {
	plannedAt(
		milestone: SocialPostMilestone,
		date: string,
		time: string,
		timeZone: string,
		startTime: string,
	): string | null {
		if (milestone === "announcement") return null;
		if (milestone === "d0" && time >= startTime)
			throw new Error("Event-day reminder must precede event start");
		const day = new Date(`${date}T12:00:00Z`);
		if (
			!Number.isFinite(day.getTime()) ||
			day.toISOString().slice(0, 10) !== date
		)
			throw new Error("Invalid content event date");
		if (milestone === "d7") day.setUTCDate(day.getUTCDate() - 7);
		return this.instant(day.toISOString().slice(0, 10), time, timeZone);
	}
	instant(date: string, time: string, timeZone: string): string {
		if (
			!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
			!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)
		)
			throw new Error("Invalid content local time");
		const format = new Intl.DateTimeFormat("sv-SE", {
			timeZone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			hourCycle: "h23",
		});
		const reference = Date.parse(`${date}T${time}:00Z`);
		const matches: string[] = [];
		for (let offset = -840; offset <= 840; offset += 15) {
			const candidate = new Date(reference + offset * 60_000);
			if (format.format(candidate) === `${date} ${time}`)
				matches.push(candidate.toISOString());
		}
		if (matches.length !== 1)
			throw new Error("Ambiguous or nonexistent content local time");
		return matches[0];
	}
	expiresAt(plan: SocialPostSchedule): string {
		const start = this.instant(
			plan.facts.date,
			plan.facts.startTime,
			plan.facts.timeZone,
		);
		if (!plan.plannedAt) return start;
		const format = new Intl.DateTimeFormat("sv-SE", {
			timeZone: plan.facts.timeZone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		});
		const day = new Date(
			`${format.format(new Date(plan.plannedAt))}T12:00:00Z`,
		);
		day.setUTCDate(day.getUTCDate() + 1);
		const midnight = this.instant(
			day.toISOString().slice(0, 10),
			"00:00",
			plan.facts.timeZone,
		);
		return Date.parse(midnight) < Date.parse(start) ? midnight : start;
	}
	expired(plan: SocialPostSchedule, now: string): boolean {
		return (
			!Number.isFinite(Date.parse(now)) ||
			Date.parse(now) >= Date.parse(this.expiresAt(plan))
		);
	}

	publicationEligible(plan: SocialPostSchedule, now: string): boolean {
		return (
			!this.expired(plan, now) &&
			(!plan.plannedAt || Date.parse(now) >= Date.parse(plan.plannedAt))
		);
	}
}
