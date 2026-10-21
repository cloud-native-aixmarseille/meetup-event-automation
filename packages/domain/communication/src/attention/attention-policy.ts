import type { CommunicationCalendar } from "../communication-calendar.js";
import type { AttentionEpisode } from "./model.js";
export interface AttentionPolicyCollaborators {
	readonly communicationCalendar: Pick<
		CommunicationCalendar,
		"getLocalDate" | "toEpochDay" | "parseIsoLocalDate"
	>;
}

export class AttentionPolicy {
	constructor(private readonly collaborators: AttentionPolicyCollaborators) {}

	day(now: Date): number {
		const local = this.collaborators.communicationCalendar.getLocalDate(
			now,
			"Europe/Paris",
		);
		if (!local) throw new Error("Invalid attention clock");
		return this.collaborators.communicationCalendar.toEpochDay(local);
	}
	eventDay(date: string): number | undefined {
		const local =
			this.collaborators.communicationCalendar.parseIsoLocalDate(date);
		return local
			? this.collaborators.communicationCalendar.toEpochDay(local)
			: undefined;
	}
	window(
		episode: AttentionEpisode,
		date: string,
		now: Date,
	): string | undefined {
		const day = this.day(now);
		const policy = episode.condition.policy;
		if (policy === "daily") return `day:${day}`;
		if (policy === "weekly")
			return `week:${Math.floor((day - this.day(new Date(episode.openedAt))) / 7)}`;
		if (policy === "approval") {
			const age =
				now.getTime() - Date.parse(episode.condition.since ?? episode.openedAt);
			return age >= 86_400_000 ? `day:${day}` : undefined;
		}
		const eventDay = this.eventDay(date);
		if (eventDay === undefined) return undefined;
		return this.milestone(policy, day - eventDay);
	}
	private milestone(
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
	view(state: import("./model.js").AttentionState) {
		return {
			state,
			conditions: state.episodes
				.filter((item) => item.status === "active" || item.status === "unknown")
				.sort(this.compare.bind(this)),
		};
	}
	private compare(left: AttentionEpisode, right: AttentionEpisode): number {
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
