import type {
	AttentionChecklist,
	AttentionChecklistAction,
	AttentionChecklistEntry,
} from "./attention-checklist.js";
import type { AttentionEpisode, AttentionView } from "./model.js";
/** Chooses concrete organizer work independently of either output channel. */
export class AttentionTaskSelection {
	static select(view: AttentionView, checklist: AttentionChecklist) {
		const conditions = view.conditions.filter(
			(episode) => !AttentionTaskSelection.covered(episode, checklist.entries),
		);
		const tasks = view.state.stopped
			? []
			: checklist.entries.filter(
					(entry) =>
						!conditions.some(
							(episode) =>
								entry.action !== undefined &&
								entry.action === AttentionTaskSelection.action(episode),
						),
				);
		const urgent = conditions.filter(AttentionTaskSelection.urgent);
		return {
			urgent,
			checklist: [...tasks].sort(
				(left, right) =>
					Number(right.field === "agenda") - Number(left.field === "agenda"),
			),
			remaining: conditions.filter(
				(episode) => !AttentionTaskSelection.urgent(episode),
			),
			details: conditions.filter(
				(episode) =>
					!(
						view.state.commentId &&
						["follow-up", "approval-pending"].includes(episode.condition.code)
					) &&
					!(
						episode.status !== "unknown" &&
						checklist.entries.some(
							(entry) =>
								entry.action !== undefined &&
								entry.action === AttentionTaskSelection.action(episode),
						)
					),
			),
		};
	}
	private static urgent(episode: AttentionEpisode): boolean {
		return [
			"delivery-recovery",
			"approval-pending",
			"integration-failure",
		].includes(episode.condition.code);
	}
	private static action(
		episode: AttentionEpisode,
	): AttentionChecklistAction | undefined {
		if (episode.condition.code === "delivery-recovery")
			return "delivery-recovery";
		if (episode.condition.code !== "approval-pending") return undefined;
		return episode.condition.resource.startsWith("meetup-publication:")
			? "meetup-approval"
			: "email-approval";
	}
	private static covered(
		episode: AttentionEpisode,
		entries: readonly AttentionChecklistEntry[],
	): boolean {
		if (!entries.length) return false;
		const { code, resource } = episode.condition;
		if (
			code === "required-data" ||
			(code === "integration-failure" && resource === "event-data")
		)
			return true;
		const fields =
			code === "manual-publication"
				? AttentionTaskSelection.RESOURCE_FIELDS.get(resource)
				: AttentionTaskSelection.CONDITION_FIELDS.get(code);
		return (
			fields?.some((field) => entries.some((entry) => entry.field === field)) ??
			false
		);
	}
	private static readonly CONDITION_FIELDS = new Map([
		["missing-date", ["date"]],
		["host-confirmation", ["host", "host-confirmation"]],
		["speaker-confirmation", ["speaker-confirmation"]],
	]);
	private static readonly RESOURCE_FIELDS = new Map([
		["publish-meetup-event", ["meetup"]],
		["publish-community-event", ["community"]],
	]);
}
