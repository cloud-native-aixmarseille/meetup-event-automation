import type {
	AttentionChecklist,
	AttentionChecklistAction,
	AttentionChecklistEntry,
	AttentionChecklistField,
	AttentionChecklistSource,
} from "@meetup-automation/communication";
import { ATTENTION_MARKER } from "./attention-record.js";
import type {
	AttentionMessages,
	AttentionMessagesArguments,
} from "./i18n/attention-messages.js";
export const DIAGNOSTIC_MARKER =
	"<!-- meetup-automation:event-diagnostics:v1 -->";
/** Decodes the diagnostic writer's public Markdown; it does not select tasks. */
export interface AttentionDiagnosticChecklistCollaborators {
	readonly createAttentionMessages: (
		...args: AttentionMessagesArguments
	) => AttentionMessages;
}

export class AttentionDiagnosticChecklist implements AttentionChecklistSource {
	constructor(
		private readonly collaborators: AttentionDiagnosticChecklistCollaborators,
	) {}

	private body = "";
	private commentId?: number;
	set(commentId: number, body: string): void {
		if (
			!body.startsWith(DIAGNOSTIC_MARKER) ||
			!Number.isSafeInteger(commentId) ||
			commentId < 1
		)
			throw new Error("Invalid diagnostic checklist");
		this.commentId = commentId;
		this.body = body.split(ATTENTION_MARKER, 1)[0].trim();
	}
	prefix(): string {
		return this.body;
	}
	read(): AttentionChecklist {
		const entries = [...new Set(this.body.split("\n"))].flatMap((line) => {
			const match = /^- \[ \] \*\*(.+?)\*\*: (.+)$/.exec(line);
			if (!match) return [];
			const [, label, description] = match;
			return [
				{
					label,
					description,
					field: AttentionDiagnosticChecklist.FIELDS.get(label) ?? "other",
					action: this.action(description),
				} satisfies AttentionChecklistEntry,
			];
		});
		return { commentId: this.commentId, entries };
	}
	private action(description: string): AttentionChecklistAction | undefined {
		for (const locale of ["en", "fr"]) {
			const messages = this.collaborators.createAttentionMessages(locale);
			if (description === messages.t("action.social-approval-pending"))
				return "social-approval";
			if (description === messages.t("action.approval-pending"))
				return "email-approval";
			if (description === messages.t("action.community-approval-pending"))
				return "community-approval";
			if (description === messages.t("action.meetup-approval-pending"))
				return "meetup-approval";
			if (description === messages.t("action.delivery-recovery"))
				return "delivery-recovery";
		}
		return undefined;
	}
	private static readonly FIELDS = new Map<string, AttentionChecklistField>([
		["Event Date", "date"],
		["Hoster", "host"],
		["Host confirmation", "host-confirmation"],
		["Speaker confirmation", "speaker-confirmation"],
		["Meetup Link", "meetup"],
		["CNCF Link", "community"],
		["Agenda", "agenda"],
	]);
}
