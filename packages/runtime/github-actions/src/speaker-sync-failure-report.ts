import { SpeakerSynchronizationError } from "@meetup-automation/journey";
import { ProposalSourceError } from "@meetup-automation/referential";
import type { PublicDiagnostic } from "@meetup-automation/journey";
import type { ActionReportData } from "./action-report.js";
import { ActionMessages } from "./i18n/action-messages.js";

interface SpeakerSyncBlockedReport {
	readonly report: ActionReportData;
	readonly prBody: string;
}

export class SpeakerSyncFailureReport {
	static create(
		error: unknown,
		messages: ActionMessages,
	): SpeakerSyncBlockedReport {
		const failure =
			error instanceof SpeakerSynchronizationError ? error : undefined;
		const cause = failure?.cause ?? error;
		const diagnostics = failure?.diagnostics.length
			? failure.diagnostics
			: [SpeakerSyncFailureReport.diagnostic(cause)];
		const stage = messages.t(
			`report.speaker-sync.stage.${failure?.stage ?? "unknown"}`,
		);
		const guidance = diagnostics
			.map(
				(item) =>
					`- ${item.field ? `${item.field}: ` : ""}${messages.diagnostic(item.code, item.message)}`,
			)
			.join("\n");
		return {
			report: {
				details: [messages.t("report.speaker-sync.failed", { stage })],
				diagnostics,
			},
			prBody: guidance,
		};
	}
	private static diagnostic(error: unknown): PublicDiagnostic {
		const source = error instanceof ProposalSourceError ? error : undefined;
		const context = source?.context;
		const reason = context?.reason ?? source?.code ?? "unexpected";
		const status = context?.status;
		const kind =
			reason === "http" && (status === 401 || status === 403)
				? "authentication"
				: reason === "http" && status === 404
					? "event-not-found"
					: reason;
		const code = `speaker-sync.${kind}` as const;
		const field = context?.field;
		const safeField =
			field &&
			/^(?:export|proposals(?:\[\d+\])?(?:\.(?:id|proposalNumber|title|abstract|speakers|email|name|company|languages|formats)(?:\[\d+\])?)*|speakers\[\d+\])$/.test(
				field,
			)
				? field
				: undefined;
		return {
			code,
			severity: "error",
			message: new ActionMessages().t(`diagnostic.${code}`),
			field:
				Number.isInteger(status) &&
				Number(status) >= 100 &&
				Number(status) <= 599
					? `HTTP ${status}`
					: safeField,
		};
	}
}
