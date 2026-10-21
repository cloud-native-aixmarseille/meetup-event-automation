import type { AttentionState } from "./model.js";
/** Invariants of persisted and newly reconciled notification authority. */
export class AttentionStateRules {
	validate(state: AttentionState): void {
		if (
			new Set(state.episodes.map((item) => item.condition.key)).size !==
			state.episodes.length
		)
			throw new Error("Duplicate attention condition");
		for (const episode of state.episodes)
			if (
				episode.condition.key !==
				`${episode.condition.code}:${episode.condition.resource}`
			)
				throw new Error("Invalid attention resource");
		const post = state.post;
		if (!post) return;
		if (post.status === "accepted" && !post.message)
			throw new Error("Missing accepted attention reference");
		if (
			post.status !== "accepted" &&
			(post.message !== undefined || post.fingerprint !== undefined)
		)
			throw new Error(
				"Unconfirmed attention reservation has delivery authority",
			);
		if (post.status !== "retry" && post.retryAt !== undefined)
			throw new Error("Unexpected attention retry");
	}
}
