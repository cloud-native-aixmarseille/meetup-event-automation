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
	expired(plan: SocialPostSchedule, now: string): boolean {
		const start = this.instant(
			plan.facts.date,
			plan.facts.startTime,
			plan.facts.timeZone,
		);
		if (
			!Number.isFinite(Date.parse(now)) ||
			Date.parse(now) >= Date.parse(start)
		)
			return true;
		if (!plan.plannedAt) return false;
		const format = new Intl.DateTimeFormat("sv-SE", {
			timeZone: plan.facts.timeZone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		});
		return (
			format.format(new Date(now)) > format.format(new Date(plan.plannedAt))
		);
	}

	publicationEligible(plan: SocialPostSchedule, now: string): boolean {
		const start = this.instant(
			plan.facts.date,
			plan.facts.startTime,
			plan.facts.timeZone,
		);
		if (
			!Number.isFinite(Date.parse(now)) ||
			Date.parse(now) >= Date.parse(start)
		)
			return false;
		if (!plan.plannedAt) return true;
		const format = new Intl.DateTimeFormat("sv-SE", {
			timeZone: plan.facts.timeZone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		});
		return (
			Date.parse(now) >= Date.parse(plan.plannedAt) &&
			format.format(new Date(now)) === format.format(new Date(plan.plannedAt))
		);
	}
}
