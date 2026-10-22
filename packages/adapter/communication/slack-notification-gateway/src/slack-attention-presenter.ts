import type {
	AttentionChecklistSource,
	AttentionEpisode,
	AttentionPolicy,
	AttentionState,
	AttentionTaskSelection,
	AttentionView,
} from "@meetup-automation/communication";
import type { SlackAttentionMessages } from "./attention-i18n/slack-attention-messages.js";
/** Formats the selected public task facts for Slack, without storage or task policy. */
export interface SlackAttentionPresenterCollaborators {
	readonly attentionTaskSelection: Pick<
		AttentionTaskSelection,
		"select" | "actionFor"
	>;
	readonly attentionPolicy: Pick<AttentionPolicy, "eventDay">;
}

export class SlackAttentionPresenter {
	private readonly issueUrl: string;
	constructor(
		private readonly collaborators: SlackAttentionPresenterCollaborators,
		private readonly repository: string,
		private readonly issueNumber: number,
		private readonly messages: Pick<
			SlackAttentionMessages,
			"t" | "locale" | "failure" | "task"
		>,
		private readonly checklist: AttentionChecklistSource,
	) {
		if (
			!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) ||
			!Number.isSafeInteger(issueNumber) ||
			issueNumber < 1
		)
			throw new Error("Invalid attention issue identity");
		this.issueUrl = `https://github.com/${repository}/issues/${issueNumber}`;
	}
	render(view: AttentionView): string {
		const title = this.messages.t("slack.title", {
			issue: String(this.issueNumber),
		});
		const actions = this.slackActions(view);
		const icon = actions.length ? "⚠️" : "✅";
		const date = this.slackDate(view.state.eventDate);
		const lines = [
			`${icon} *${this.link(this.overviewUrl(view.state), title)}*${date ? ` · ${date}` : ""}`,
			"",
		];
		lines.push(...actions.slice(0, 6));
		if (!actions.length)
			lines.push(this.escape(this.messages.t("attention.clear")));
		if (actions.length > 6)
			lines.push(
				this.link(
					this.overviewUrl(view.state),
					this.messages.t("slack.more", { count: actions.length - 6 }),
				),
			);
		return lines.join("\n");
	}
	private slackActions(view: AttentionView): string[] {
		const selection = this.collaborators.attentionTaskSelection.select(
			view,
			this.checklist.read(),
		);
		return [
			...new Set([
				...selection.urgent.map((episode) =>
					this.slackCondition(episode, view.state),
				),
				...selection.checklist.map(
					(entry) => `• ${this.escape(`${entry.label}: ${entry.description}`)}`,
				),
				...selection.remaining.map((episode) =>
					this.slackCondition(episode, view.state),
				),
			]),
		];
	}
	private slackDate(date: string): string {
		if (this.collaborators.attentionPolicy.eventDay(date) === undefined)
			return "";
		return new Intl.DateTimeFormat(this.messages.locale, {
			day: "numeric",
			month: "short",
			year: "numeric",
			timeZone: "UTC",
		}).format(new Date(`${date}T00:00:00Z`));
	}
	private slackCondition(
		episode: AttentionEpisode,
		state: AttentionState,
	): string {
		const text = this.action(episode);
		const url = this.url(episode, state);
		const label = this.messages.t(
			episode.condition.commentId ||
				(state.commentId && episode.condition.code === "follow-up")
				? "slack.review"
				: "slack.run",
		);
		const link =
			url === this.overviewUrl(state) ? "" : ` · ${this.link(url, label)}`;
		const unknown =
			episode.status === "unknown"
				? ` _(${this.escape(this.messages.t("slack.unknown"))})_`
				: "";
		return `• ${this.escape(text)}${unknown}${link}`;
	}
	private link(url: string, label: string): string {
		return `<${this.escape(url)}|${this.escape(label)}>`;
	}
	private escape(value: string): string {
		return value
			.replaceAll("&", "&amp;")
			.replaceAll("<", "&lt;")
			.replaceAll(">", "&gt;");
	}
	private action(episode: AttentionEpisode): string {
		if (
			this.collaborators.attentionTaskSelection.actionFor(episode) ===
			"meetup-approval"
		)
			return this.messages.t("action.meetup-approval-pending");
		return episode.condition.code === "integration-failure"
			? this.messages.failure(episode.condition.resource)
			: this.messages.t(`action.${episode.condition.code}`, {
					task: this.messages.task(episode.condition.resource),
				});
	}
	private url(episode: AttentionEpisode, state: AttentionState): string {
		if (
			Number.isSafeInteger(episode.condition.commentId) &&
			(episode.condition.commentId ?? 0) > 0
		)
			return `${this.issueUrl}#issuecomment-${episode.condition.commentId}`;
		if (
			["integration-failure", "stage-unknown"].includes(
				episode.condition.code,
			) &&
			state.runId &&
			/^\d+$/.test(state.runId)
		)
			return `https://github.com/${this.repository}/actions/runs/${state.runId}`;
		return this.overviewUrl(state);
	}
	private overviewUrl(state: AttentionState): string {
		const commentId = state.commentId ?? this.checklist.read().commentId;
		return commentId
			? `${this.issueUrl}#issuecomment-${commentId}`
			: this.issueUrl;
	}
}
