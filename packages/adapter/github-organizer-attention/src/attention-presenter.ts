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
		// All interpolated values are validated identifiers or owner-local catalog text.
		const lines = [
			`${this.messages.t("attention.title")} #${this.issueNumber}`,
			this.date(view.state),
			...(view.state.stopped ? [this.messages.t("attention.stopped")] : []),
		];
		for (const episode of view.conditions.slice(0, 5))
			lines.push(`• ${this.text(episode)} ${this.url(episode, view.state)}`);
		if (!view.conditions.length) lines.push(this.messages.t("attention.clear"));
		if (view.conditions.length > 5)
			lines.push(this.messages.t("attention.more"));
		lines.push(`${this.messages.t("attention.full")}: ${this.issueUrl}`);
		return lines
			.join("\n")
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
		if (episode.condition.commentId)
			return `${this.issueUrl}#issuecomment-${episode.condition.commentId}`;
		if (
			["integration-failure", "stage-unknown"].includes(
				episode.condition.code,
			) &&
			state.runId
		)
			return `https://github.com/${this.repository}/actions/runs/${state.runId}`;
		return this.issueUrl;
	}
}
