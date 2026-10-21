import type {
	AttentionCondition,
	AttentionEpisode,
	AttentionState,
} from "./model.js";
/** Episode order and omitted optional fields do not change reservation authority. */
export class AttentionStateEquality {
	static equal(left: AttentionState, right: AttentionState): boolean {
		return (
			left.eventDate === right.eventDate &&
			left.stopped === right.stopped &&
			left.runId === right.runId &&
			left.commentId === right.commentId &&
			AttentionStateEquality.post(left.post, right.post) &&
			left.episodes.length === right.episodes.length &&
			left.episodes.every((episode) => {
				const counterpart = right.episodes.find(
					(item) => item.condition.key === episode.condition.key,
				);
				return (
					counterpart !== undefined &&
					AttentionStateEquality.episode(episode, counterpart)
				);
			})
		);
	}
	private static episode(
		left: AttentionEpisode,
		right: AttentionEpisode,
	): boolean {
		return (
			left.episode === right.episode &&
			left.openedAt === right.openedAt &&
			left.status === right.status &&
			left.lastWindow === right.lastWindow &&
			AttentionStateEquality.condition(left.condition, right.condition)
		);
	}
	private static condition(
		left: AttentionCondition,
		right: AttentionCondition,
	): boolean {
		return (
			left.key === right.key &&
			left.code === right.code &&
			left.owner === right.owner &&
			left.resource === right.resource &&
			left.severity === right.severity &&
			left.policy === right.policy &&
			left.since === right.since &&
			left.commentId === right.commentId &&
			left.recovery === right.recovery
		);
	}
	private static post(
		left: AttentionState["post"],
		right: AttentionState["post"],
	): boolean {
		if (!left || !right) return left === right;
		return (
			left.reservationId === right.reservationId &&
			left.day === right.day &&
			left.reservedAt === right.reservedAt &&
			left.status === right.status &&
			left.retryAt === right.retryAt &&
			left.fingerprint === right.fingerprint &&
			left.message?.destination === right.message?.destination &&
			left.message?.messageId === right.message?.messageId
		);
	}
}
