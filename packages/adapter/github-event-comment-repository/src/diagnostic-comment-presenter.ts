import type { EventDiagnostic } from "@meetup-automation/event";
import type { OrganizerDiagnosticPolicy } from "@meetup-automation/journey";
import type {
	DiagnosticPresentation,
	DiagnosticPresenter,
} from "./diagnostic-presentation.js";
import { EVENT_DIAGNOSTIC_COMMENT_MARKER } from "./github-event-comment-repository-contracts.js";
import type {
	EventCommentMessages,
	EventCommentMessagesArguments,
} from "./i18n/event-comment-messages.js";
export interface DiagnosticCommentPresenterCollaborators {
	readonly organizerDiagnosticPolicy: Pick<
		OrganizerDiagnosticPolicy,
		"suppressed"
	>;
	readonly diagnosticPresenter: Pick<DiagnosticPresenter, "presentDiagnostic">;
	readonly createEventCommentMessages: (
		...args: EventCommentMessagesArguments
	) => EventCommentMessages;
}

export class DiagnosticCommentPresenter {
	constructor(
		private readonly collaborators: DiagnosticCommentPresenterCollaborators,
	) {}

	render(
		diagnostics: readonly EventDiagnostic[],
		messages = this.collaborators.createEventCommentMessages(),
	): string {
		const actionable = new Map<string, DiagnosticPresentation>();
		for (const item of diagnostics) {
			if (
				this.collaborators.organizerDiagnosticPolicy.suppressed(
					item,
					diagnostics,
				)
			) {
				continue;
			}
			const presentation =
				this.collaborators.diagnosticPresenter.presentDiagnostic(
					item,
					messages,
				);
			actionable.set(
				`${presentation.field}:${presentation.message}`,
				presentation,
			);
		}

		if (actionable.size === 0) {
			return `${EVENT_DIAGNOSTIC_COMMENT_MARKER}\n\n${messages.t("comment.resolved")}`;
		}

		const lines = [...actionable.values()]
			.sort(
				(left, right) =>
					left.order - right.order ||
					left.field.localeCompare(right.field, messages.locale, {
						numeric: true,
					}) ||
					left.message.localeCompare(right.message, messages.locale),
			)
			.map(({ field, message }) => `- [ ] **${field}**: ${message}`);

		return [EVENT_DIAGNOSTIC_COMMENT_MARKER, "", ...lines].join("\n");
	}
}
