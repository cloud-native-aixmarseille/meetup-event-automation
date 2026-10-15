import { CommunicationCalendar } from "../communication-calendar.js";
import type { AttentionEpisode } from "./model.js";
export class AttentionPolicy {
	static day(now: Date): number {
		const local = CommunicationCalendar.getLocalDate(now, "Europe/Paris");
		if (!local) throw new Error("Invalid attention clock");
		return CommunicationCalendar.toEpochDay(local);
	}
	static eventDay(date: string): number | undefined {
		const local = CommunicationCalendar.parseIsoLocalDate(date);
		return local ? CommunicationCalendar.toEpochDay(local) : undefined;
	}
	static window(
		episode: AttentionEpisode,
		date: string,
		now: Date,
	): string | undefined {
		const day = AttentionPolicy.day(now);
		const policy = episode.condition.policy;
		if (policy === "daily") return `day:${day}`;
		if (policy === "weekly")
			return `week:${Math.floor((day - AttentionPolicy.day(new Date(episode.openedAt))) / 7)}`;
		if (policy === "approval") {
			const age =
				now.getTime() - Date.parse(episode.condition.since ?? episode.openedAt);
			return age >= 86_400_000 ? `day:${day}` : undefined;
		}
		const eventDay = AttentionPolicy.eventDay(date);
		if (eventDay === undefined) return undefined;
		return AttentionPolicy.milestone(policy, day - eventDay);
	}
	private static milestone(
		policy: AttentionEpisode["condition"]["policy"],
		elapsed: number,
	): string | undefined {
		if (policy === "preparation") {
			if (elapsed < -7 || elapsed > 0) return undefined;
			const milestone = [0, 1, 3, 7].find((days) => elapsed >= -days);
			return `preparation:${milestone}`;
		}
		if ((policy === "occurrence" || policy === "follow-up") && elapsed >= 1)
			return `${policy}:${elapsed >= 7 ? 7 : 1}`;
		return undefined;
	}
	static view(state: import("./model.js").AttentionState) {
		return {
			state,
			conditions: state.episodes
				.filter((item) => item.status === "active" || item.status === "unknown")
				.sort(AttentionPolicy.compare),
		};
	}
	private static compare(
		left: AttentionEpisode,
		right: AttentionEpisode,
	): number {
		const severity =
			Number(right.condition.severity === "error") -
			Number(left.condition.severity === "error");
		return (
			severity ||
			left.openedAt.localeCompare(right.openedAt) ||
			left.condition.key.localeCompare(right.condition.key)
		);
	}
}
