import {
	type AttentionContent,
	type AttentionEpisode,
	AttentionPolicy,
	type AttentionState,
	type AttentionView,
} from "@meetup-automation/communication";
import { AttentionDiagnosticChecklist } from "./attention-diagnostic-checklist.js";
import { AttentionRecord } from "./attention-record.js";
import { AttentionMessages } from "./i18n/attention-messages.js";
export class AttentionPresenter implements AttentionContent {
	private readonly issueUrl: string;
	private readonly diagnostics = new AttentionDiagnosticChecklist();
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
	setDiagnosticComment(id: number, body: string): void {
		this.diagnostics.set(id, body);
	}
	retired(commentId: number): string {
		return [this.diagnostics.prefix(), this.redirect(commentId)]
			.filter(Boolean)
			.join("\n\n");
	}
	redirect(commentId: number): string {
		return this.messages.t("attention.redirect", {
			url: `${this.issueUrl}#issuecomment-${commentId}`,
		});
	}
	issue(state: AttentionState): string {
		return [
			this.diagnostics.prefix(),
			AttentionRecord.marker(state),
			this.details(state),
		]
			.filter(Boolean)
			.join("\n\n");
	}
	details(state: AttentionState): string {
		const view = AttentionPolicy.view(state);
		const lines = this.status(state);
		for (const episode of view.conditions) {
			if (
				this.diagnostics.includes(episode) ||
				(episode.status !== "unknown" &&
					this.diagnostics.containsAction(this.action(episode))) ||
				(state.commentId &&
					["follow-up", "approval-pending"].includes(episode.condition.code))
			)
				continue;
			const url = this.url(episode, state);
			const link =
				url === this.overviewUrl(state)
					? ""
					: ` ([${this.messages.t("slack.review")}](${url}))`;
			lines.push(`- [ ] ${this.text(episode)}${link}`);
		}
		if (!view.conditions.length && !this.diagnostics.prefix() && !lines.length)
			lines.push(this.messages.t("attention.clear"));
		return [...new Set(lines)].join("\n");
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
			lines.push(AttentionPresenter.escape(this.messages.t("attention.clear")));
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
		const remaining = view.conditions.filter(
			(episode) => !this.diagnostics.includes(episode),
		);
		const urgent = remaining.filter((episode) =>
			["delivery-recovery", "approval-pending", "integration-failure"].includes(
				episode.condition.code,
			),
		);
		const checklist = view.state.stopped
			? []
			: this.diagnostics
					.lines()
					.filter(
						(line) =>
							!remaining.some((episode) =>
								line.endsWith(`**: ${this.action(episode)}`),
							),
					);
		checklist.sort(
			(left, right) =>
				Number(right.includes("Conference Hall")) -
				Number(left.includes("Conference Hall")),
		);
		return [
			...new Set([
				...urgent.map((episode) => this.slackCondition(episode, view.state)),
				...checklist.map(
					(line) =>
						`• ${AttentionPresenter.escape(line.replace(/^- \[ \] /, "").replaceAll("**", ""))}`,
				),
				...remaining
					.filter((episode) => !urgent.includes(episode))
					.map((episode) => this.slackCondition(episode, view.state)),
			]),
		];
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
	private status(state: AttentionState): string[] {
		return state.post?.status === "pending"
			? [`- [ ] ${this.messages.t("attention.pending")}`]
			: [];
	}
	private text(episode: AttentionEpisode): string {
		const text = this.action(episode);
		return episode.status === "unknown"
			? `${text} (${this.messages.t("slack.unknown")})`
			: text;
	}
	private action(episode: AttentionEpisode): string {
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
		const commentId = state.commentId ?? this.diagnostics.commentId;
		return commentId
			? `${this.issueUrl}#issuecomment-${commentId}`
			: this.issueUrl;
	}
}
