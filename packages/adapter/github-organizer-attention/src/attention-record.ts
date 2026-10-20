import {
	ATTENTION_CODES,
	type AttentionCondition,
	type AttentionEpisode,
	type AttentionState,
} from "@meetup-automation/communication";
export const ATTENTION_MARKER = "<!-- meetup-organizer-attention:v1 ";
export class AttentionRecord {
	static read(body: string): AttentionState {
		const lines = body
			.split("\n")
			.filter((line) => line.startsWith(ATTENTION_MARKER));
		if (lines.length !== 1) throw new Error("Invalid attention record");
		const line = lines[0];
		if (!line?.startsWith(ATTENTION_MARKER) || !line.endsWith(" -->"))
			throw new Error("Invalid attention record");
		const state = JSON.parse(
			line.slice(ATTENTION_MARKER.length, -4),
		) as AttentionState;
		if (
			state.version !== 1 ||
			typeof state.eventDate !== "string" ||
			!/^(?:\d{4}-\d{2}-\d{2})?$/.test(state.eventDate) ||
			typeof state.stopped !== "boolean" ||
			!Array.isArray(state.episodes) ||
			state.episodes.length > 300
		)
			throw new Error("Invalid attention state");
		const episodes = state.episodes.map(AttentionRecord.episode);
		if (
			new Set(episodes.map((item) => item.condition.key)).size !==
			episodes.length
		)
			throw new Error("Duplicate attention condition");
		if (state.runId !== undefined && !/^\d+$/.test(state.runId))
			throw new Error("Invalid attention run");
		if (
			state.commentId !== undefined &&
			(!Number.isSafeInteger(state.commentId) || state.commentId <= 0)
		)
			throw new Error("Invalid attention comment");
		return {
			version: 1,
			eventDate: state.eventDate,
			stopped: state.stopped,
			episodes,
			post: AttentionRecord.post(state.post),
			runId: state.runId,
			commentId: state.commentId,
		};
	}
	static marker(state: AttentionState): string {
		const body = `${ATTENTION_MARKER}${JSON.stringify(state)} -->`;
		const safe = AttentionRecord.read(body);
		return `${ATTENTION_MARKER}${JSON.stringify(safe)} -->`;
	}
	private static episode(episode: AttentionEpisode): AttentionEpisode {
		if (
			!Number.isSafeInteger(episode.episode) ||
			episode.episode < 1 ||
			!AttentionRecord.instant(episode.openedAt) ||
			!["active", "unknown", "resolved", "stopped"].includes(episode.status)
		)
			throw new Error("Invalid attention episode");
		if (
			episode.lastWindow !== undefined &&
			!/^(?:day|week|preparation|occurrence|follow-up):-?\d+$/.test(
				episode.lastWindow,
			)
		)
			throw new Error("Invalid attention window");
		return {
			condition: AttentionRecord.condition(episode.condition),
			episode: episode.episode,
			openedAt: episode.openedAt,
			status: episode.status,
			lastWindow: episode.lastWindow,
		};
	}
	private static condition(condition: AttentionCondition): AttentionCondition {
		if (
			!ATTENTION_CODES.includes(condition.code) ||
			![
				"event",
				"assets",
				"feedback",
				"communications",
				"approvals",
				"delivery",
			].includes(condition.owner) ||
			!["warning", "error"].includes(condition.severity) ||
			![
				"preparation",
				"daily",
				"weekly",
				"approval",
				"occurrence",
				"follow-up",
				"none",
			].includes(condition.policy)
		)
			throw new Error("Invalid attention condition");
		if (
			typeof condition.resource !== "string" ||
			!/^[a-z0-9:-]{1,128}$/.test(condition.resource) ||
			condition.key !== `${condition.code}:${condition.resource}`
		)
			throw new Error("Invalid attention resource");
		if (
			condition.since !== undefined &&
			!AttentionRecord.instant(condition.since)
		)
			throw new Error("Invalid attention timestamp");
		if (
			condition.commentId !== undefined &&
			(!Number.isSafeInteger(condition.commentId) || condition.commentId <= 0)
		)
			throw new Error("Invalid attention source");
		if (condition.recovery !== undefined && condition.recovery !== true)
			throw new Error("Invalid recovery flag");
		return {
			key: condition.key,
			code: condition.code,
			owner: condition.owner,
			resource: condition.resource,
			severity: condition.severity,
			policy: condition.policy,
			since: condition.since,
			commentId: condition.commentId,
			recovery: condition.recovery,
		};
	}
	private static post(post: AttentionState["post"]): AttentionState["post"] {
		if (!post) return undefined;
		if (
			!/^attention:\d+:\d+$/.test(post.reservationId) ||
			!Number.isSafeInteger(post.day) ||
			!AttentionRecord.instant(post.reservedAt) ||
			!["pending", "accepted", "retry"].includes(post.status)
		)
			throw new Error("Invalid attention reservation");
		if (post.retryAt !== undefined && !AttentionRecord.instant(post.retryAt))
			throw new Error("Invalid attention retry");
		if (
			post.fingerprint !== undefined &&
			!/^[a-f0-9]{64}$/.test(post.fingerprint)
		)
			throw new Error("Invalid attention fingerprint");
		if (post.status === "accepted" && !post.message)
			throw new Error("Missing accepted attention reference");
		if (
			post.message &&
			(!/^[CGD][A-Z0-9]+$/.test(post.message.destination) ||
				!/^\d+\.\d+$/.test(post.message.messageId))
		)
			throw new Error("Invalid attention message");
		return {
			reservationId: post.reservationId,
			day: post.day,
			reservedAt: post.reservedAt,
			status: post.status,
			retryAt: post.retryAt,
			fingerprint: post.fingerprint,
			message: post.message
				? {
						destination: post.message.destination,
						messageId: post.message.messageId,
					}
				: undefined,
		};
	}
	private static instant(value: string): boolean {
		return (
			typeof value === "string" &&
			/^\d{4}-\d{2}-\d{2}T/.test(value) &&
			Number.isFinite(Date.parse(value))
		);
	}
}
