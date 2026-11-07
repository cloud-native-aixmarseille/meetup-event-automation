import type { AttentionPolicy } from "./attention-policy.js";
import type { AttentionEpisode } from "./model.js";

/** Routing uses classified conditions and existing milestones, never severity alone. */
export class AttentionRoutingPolicy {
	constructor(private readonly policy: Pick<AttentionPolicy, "window">) {}
	urgent(
		due: readonly AttentionEpisode[],
		eventDate: string,
		now: Date,
	): boolean {
		return due.some((episode) => {
			const { code, resource, since } = episode.condition;
			if (code === "delivery-recovery") return true;
			if (code === "integration-failure" && resource !== "event-data")
				return true;
			if (
				code === "approval-pending" &&
				(episode.condition.policy === "daily" ||
					now.getTime() - Date.parse(since ?? episode.openedAt) >= 86_400_000)
			)
				return true;
			return ["preparation:1", "preparation:0"].includes(
				this.policy.window(episode, eventDate, now) ?? "",
			);
		});
	}
}
