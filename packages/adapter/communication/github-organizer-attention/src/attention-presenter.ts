import type {
	AttentionEpisode,
	AttentionPolicy,
	AttentionState,
	AttentionTaskSelection,
} from "@meetup-automation/communication";
import type { AttentionDiagnosticChecklist } from "./attention-diagnostic-checklist.js";
import type { AttentionMessages } from "./i18n/attention-messages.js";
export interface AttentionPresenterCollaborators {
	readonly attentionPolicy: Pick<AttentionPolicy, "view">;
	readonly attentionTaskSelection: Pick<
		AttentionTaskSelection,
		"select" | "actionFor"
	>;
}

export class AttentionPresenter {
	private readonly issueUrl: string;
	constructor(
		private readonly collaborators: AttentionPresenterCollaborators,
		private readonly repository: string,
		issueNumber: number,
		private readonly diagnostics: Pick<
			AttentionDiagnosticChecklist,
			"read" | "prefix"
		>,
		private readonly messages: Pick<
			AttentionMessages,
			"t" | "failure" | "task"
		>,
	) {
		if (
			!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) ||
			!Number.isSafeInteger(issueNumber) ||
			issueNumber < 1
		)
			throw new Error("Invalid attention issue identity");
		this.issueUrl = `https://github.com/${repository}/issues/${issueNumber}`;
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
	issue(state: AttentionState, metadata: string): string {
		return [this.diagnostics.prefix(), metadata, this.details(state)]
			.filter(Boolean)
			.join("\n\n");
	}
	details(state: AttentionState): string {
		const view = this.collaborators.attentionPolicy.view(state);
		const lines = this.status(state);
		for (const episode of this.collaborators.attentionTaskSelection.select(
			view,
			this.diagnostics.read(),
		).details) {
			const url = this.url(episode, state);
			const link =
				url === this.overviewUrl(state)
					? ""
					: ` ([${this.messages.t("attention.review")}](${url}))`;
			lines.push(`- [ ] ${this.text(episode)}${link}`);
		}
		if (!view.conditions.length && !this.diagnostics.prefix() && !lines.length)
			lines.push(this.messages.t("attention.clear"));
		return [...new Set(lines)].join("\n");
	}
	private status(state: AttentionState): string[] {
		return state.post?.status === "pending"
			? [`- [ ] ${this.messages.t("attention.pending")}`]
			: [];
	}
	private text(episode: AttentionEpisode): string {
		const text = this.action(episode);
		return episode.status === "unknown"
			? `${text} (${this.messages.t("attention.unknown")})`
			: text;
	}
	private action(episode: AttentionEpisode): string {
		if (
			this.collaborators.attentionTaskSelection.actionFor(episode) ===
			"content-approval"
		)
			return this.messages.t("action.content-approval-pending");
		if (
			this.collaborators.attentionTaskSelection.actionFor(episode) ===
			"social-approval"
		)
			return this.messages.t("action.social-approval-pending");
		if (
			this.collaborators.attentionTaskSelection.actionFor(episode) ===
			"community-approval"
		)
			return this.messages.t("action.community-approval-pending");
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
		const commentId = state.commentId ?? this.diagnostics.read().commentId;
		return commentId
			? `${this.issueUrl}#issuecomment-${commentId}`
			: this.issueUrl;
	}
}
export type AttentionPresenterArguments =
	ConstructorParameters<typeof AttentionPresenter> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
