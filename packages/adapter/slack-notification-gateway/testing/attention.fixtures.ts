import type {
	AttentionEpisode,
	AttentionState,
} from "@meetup-automation/communication";
export function attentionState(): AttentionState {
	return { eventDate: "2099-06-08", stopped: false, episodes: [] };
}
export function attentionEpisode(
	code: AttentionEpisode["condition"]["code"] = "integration-failure",
	resource = "communications",
): AttentionEpisode {
	return {
		condition: {
			key: `${code}:${resource}`,
			code,
			resource,
			owner: "communications",
			severity: "error",
			policy: "daily",
		},
		episode: 1,
		openedAt: "2099-06-01T10:00:00Z",
		status: "active",
	};
}
