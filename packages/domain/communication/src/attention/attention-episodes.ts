import { AttentionPolicy } from "./attention-policy.js";
import type {
	AttentionEpisode,
	AttentionObservation,
	AttentionState,
} from "./model.js";
export class AttentionEpisodes {
	static reconcile(
		previous: AttentionState | undefined,
		observation: AttentionObservation,
		now: Date,
	): AttentionState {
		const state: AttentionState = previous
			? structuredClone(previous)
			: {
					eventDate: observation.eventDate,
					stopped: observation.stopped,
					episodes: [],
				};
		const changedDate = state.eventDate !== observation.eventDate;
		const conditions = new Map(
			observation.conditions.map((condition) => [condition.key, condition]),
		);
		for (const episode of state.episodes) {
			const condition = conditions.get(episode.condition.key);
			if (condition) {
				conditions.delete(condition.key);
				if (episode.status === "resolved" || episode.status === "stopped") {
					episode.episode += 1;
					episode.openedAt = now.toISOString();
					episode.lastWindow = undefined;
				}
				episode.condition = condition;
				episode.status = "active";
				if (
					changedDate &&
					episode.lastWindow &&
					["preparation", "occurrence", "follow-up"].includes(condition.policy)
				)
					episode.lastWindow = AttentionPolicy.window(
						episode,
						observation.eventDate,
						now,
					);
			} else {
				episode.status = AttentionEpisodes.absentStatus(episode, observation);
			}
		}
		for (const condition of conditions.values())
			state.episodes.push({
				condition,
				episode: 1,
				openedAt: now.toISOString(),
				status: "active",
			});
		state.eventDate = observation.eventDate;
		state.stopped = observation.stopped;
		state.runId = observation.runId;
		state.commentId = observation.commentId;
		return state;
	}
	private static absentStatus(
		episode: AttentionEpisode,
		observation: AttentionObservation,
	): AttentionEpisode["status"] {
		if (
			episode.condition.recovery &&
			(episode.status === "active" || episode.status === "unknown") &&
			!observation.verifiedRecovery?.includes(episode.condition.key)
		)
			return "unknown";
		if (observation.stopped && !episode.condition.recovery) return "stopped";
		if (observation.evaluated.includes(episode.condition.owner))
			return "resolved";
		return episode.status === "active" ? "unknown" : episode.status;
	}
	static due(state: AttentionState, now: Date): AttentionEpisode[] {
		return AttentionPolicy.view(state).conditions.filter((episode) => {
			const window = AttentionPolicy.window(episode, state.eventDate, now);
			return window !== undefined && window !== episode.lastWindow;
		});
	}
	static acknowledge(state: AttentionState, now: Date): void {
		for (const episode of AttentionPolicy.view(state).conditions) {
			const window = AttentionPolicy.window(episode, state.eventDate, now);
			if (window) episode.lastWindow = window;
		}
	}
}
