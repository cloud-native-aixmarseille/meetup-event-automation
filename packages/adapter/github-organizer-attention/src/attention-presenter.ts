import {
	AttentionPolicy,
	type AttentionContent,
	type AttentionEpisode,
	type AttentionState,
	type AttentionView,
} from "@meetup-automation/communication";
import { AttentionRecord } from "./attention-record.js";
import { AttentionMessages } from "./i18n/attention-messages.js";
export class AttentionPresenter implements AttentionContent {
	private readonly issueUrl: string;
	private diagnosticComments: readonly number[] = [];
	constructor(
		private readonly repository: string,
		private readonly issueNumber: number,
		private readonly messages = new AttentionMessages(),
	) {
		if (
			!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) ||
			!Number.isSafeInteger(issueNumber) ||
			issueNumber < 1
		)
			throw new Error("Invalid attention issue identity");
		this.issueUrl = `https://github.com/${repository}/issues/${issueNumber}`;
	}
	setDiagnosticComments(ids: readonly number[]): void {
		this.diagnosticComments = ids.filter(
			(id) => Number.isSafeInteger(id) && id > 0,
		);
	}
	issue(state: AttentionState): string {
		const view = AttentionPolicy.view(state);
		const lines = [
			AttentionRecord.marker(state),
			`## ${this.messages.t("attention.title")}`,
			this.date(state),
			...this.status(state),
		];
		for (const episode of view.conditions)
			lines.push(
				`- ${this.text(episode)} ([${this.messages.t("attention.full")}](${this.url(episode, state)}))`,
			);
		if (!view.conditions.length) lines.push(this.messages.t("attention.clear"));
		lines.push(
			this.messages.t("attention.resolved", {
				count: state.episodes.filter((item) => item.status === "resolved")
					.length,
			}),
		);
		for (const id of this.diagnosticComments)
			lines.push(
				`[${this.messages.t("attention.diagnostics")}](${this.issueUrl}#issuecomment-${id})`,
			);
		return lines.join("\n\n");
	}
	render(view: AttentionView): string {
		const title = this.messages.t("slack.title", {
			issue: String(this.issueNumber),
		});
		const icon = view.conditions.length ? "⚠️" : "✅";
		const date = this.slackDate(view.state.eventDate);
		const lines = [
			`${icon} *${this.link(this.issueUrl, title)}*${date ? ` · ${date}` : ""}`,
			"",
		];
		for (const episode of view.conditions.slice(0, 3))
			lines.push(this.slackCondition(episode, view.state));
		if (!view.conditions.length)
			lines.push(AttentionPresenter.escape(this.messages.t("attention.clear")));
		if (view.conditions.length > 3)
			lines.push(
				this.link(
					this.issueUrl,
					this.messages.t("slack.more", { count: view.conditions.length - 3 }),
				),
			);
		return lines.join("\n");
	}
	private slackDate(date: string): string {
		if (AttentionPolicy.eventDay(date) === undefined) return "";
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
		const text = this.messages.t(`slack.${episode.condition.code}`, {
			task: this.messages.task(episode.condition.resource),
		});
		const url = this.url(episode, state);
		const label = this.messages.t(
			episode.condition.commentId ? "slack.review" : "slack.run",
		);
		const link = url === this.issueUrl ? "" : ` · ${this.link(url, label)}`;
		const unknown =
			episode.status === "unknown"
				? ` _(${AttentionPresenter.escape(this.messages.t("slack.unknown"))})_`
				: "";
		return `• ${AttentionPresenter.escape(text)}${unknown}${link}`;
	}
	private link(url: string, label: string): string {
		return `<${AttentionPresenter.escape(url)}|${AttentionPresenter.escape(label)}>`;
	}
	private static escape(value: string): string {
		return value
			.replaceAll("&", "&amp;")
			.replaceAll("<", "&lt;")
			.replaceAll(">", "&gt;");
	}
	private date(state: AttentionState): string {
		return this.messages.t("attention.date", {
			date: /^\d{4}-\d{2}-\d{2}$/.test(state.eventDate) ? state.eventDate : "—",
		});
	}
	private status(state: AttentionState): string[] {
		const lines: string[] = [];
		if (state.stopped) lines.push(this.messages.t("attention.stopped"));
		if (state.post?.status === "pending")
			lines.push(this.messages.t("attention.pending"));
		if (state.post?.status === "retry")
			lines.push(this.messages.t("attention.retry"));
		return lines;
	}
	private text(episode: AttentionEpisode): string {
		const task = this.messages.task(episode.condition.resource);
		const text = this.messages.t(`attention.${episode.condition.code}`, {
			task,
		});
		return episode.status === "unknown"
			? `${text} ${this.messages.t("attention.unknown")}`
			: text;
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
		return this.issueUrl;
	}
}
