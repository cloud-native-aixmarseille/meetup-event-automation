import type { EventDiagnostic } from "@meetup-automation/event";
import { OrganizerDiagnosticPolicy } from "@meetup-automation/journey";
import {
	type DiagnosticPresentation,
	DiagnosticPresenter,
} from "./diagnostic-presentation.js";
import { EVENT_DIAGNOSTIC_COMMENT_MARKER } from "./github-event-comment-repository-contracts.js";
import { EventCommentMessages } from "./i18n/event-comment-messages.js";
export class DiagnosticCommentPresenter {
	static render(
		diagnostics: readonly EventDiagnostic[],
		messages = new EventCommentMessages(),
	): string {
		const actionable = new Map<string, DiagnosticPresentation>();
		for (const item of diagnostics) {
			if (OrganizerDiagnosticPolicy.suppressed(item, diagnostics)) {
				continue;
			}
			const presentation = DiagnosticPresenter.presentDiagnostic(
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
